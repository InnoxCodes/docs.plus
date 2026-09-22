-- One @ token rule for the mention, @everyone and regular-message fan-outs.
-- A token is @ plus the longest run of [A-Za-z0-9_-]. The @ is at the start or
-- after a character outside that set. It names a user only on an exact match.
-- The sender is never mentioned. Paired with scripts/10-func-notifications.sql.
--
-- Replaces three functions: create_mention_notifications,
-- create_everyone_notifications and create_regular_message_notifications.
-- All three stay security definer, because public.notifications has no
-- INSERT policy for authenticated.
--
-- Recreates two triggers on public.messages, because their WHEN clauses
-- change: create_everyone_notifications and create_regular_message_notifications.
-- The create_mention_notifications trigger is not recreated. Its WHEN clause
-- is unchanged, and create or replace keeps the trigger bound to its function.
--
-- Idempotent: create or replace function plus drop trigger if exists, so a
-- re-apply over a partially present state is safe.

create or replace function create_mention_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    is_channel_muted boolean;
    truncated_content text;
begin
    select mute_in_app_notifications
      into is_channel_muted
      from public.channels
     where id = new.channel_id;

    if not found or is_channel_muted then
        return new;
    end if;

    if not exists (
        select 1
          from public.users
         where id = new.user_id
    ) then
        return new;
    end if;

    truncated_content := message_content_preview(new.content, new.medias, new.type);

    -- One row per distinct token that names a member who has not muted.
    -- `everyone` belongs to create_everyone_notifications, never to a user.
    insert into public.notifications (
        receiver_user_id,
        sender_user_id,
        type,
        message_id,
        channel_id,
        message_preview,
        created_at
    )
    select
        u.id,
        new.user_id,
        'mention',
        new.id,
        new.channel_id,
        truncated_content,
        timezone('utc', now())
    from (
        select distinct token_match[1] as username
          from regexp_matches(new.content, '(?:^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]+)', 'g') as token_match
    ) as tokens
    join public.users u on u.username = tokens.username
    join public.channel_members cm on cm.member_id = u.id and cm.channel_id = new.channel_id
    where tokens.username <> 'everyone'
      and u.id <> new.user_id
      and cm.mute_in_app_notifications = false
      and cm.notif_state <> 'MUTED';

    return new;
end;
$$;

create or replace function create_everyone_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    channel_member_id uuid;
    is_channel_muted  boolean;
    truncated_content text;
begin
    select mute_in_app_notifications
      into is_channel_muted
      from public.channels
     where id = new.channel_id;

    if not found or is_channel_muted then
        return new;
    end if;

    if not exists (
        select 1
          from public.users
         where id = new.user_id
    ) then
        return new;
    end if;

    truncated_content := message_content_preview(new.content, new.medias, new.type);

    for channel_member_id in
        select cm.member_id
          from public.channel_members cm
         where cm.channel_id = new.channel_id
           and cm.member_id != new.user_id
           and cm.mute_in_app_notifications = false
           and cm.notif_state != 'MUTED'
    loop
        insert into public.notifications (
            receiver_user_id,
            sender_user_id,
            type,
            message_id,
            channel_id,
            message_preview,
            created_at
        )
        values (
            channel_member_id,
            new.user_id,
            'channel_event',
            new.id,
            new.channel_id,
            truncated_content,
            timezone('utc', now())
        );
    end loop;

    return new;
end;
$$;

create or replace function create_regular_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    is_channel_muted  boolean;
    truncated_content text;
begin
    select mute_in_app_notifications
      into is_channel_muted
      from public.channels
     where id = new.channel_id;

    if not found or is_channel_muted then
        return new;
    end if;

    if not exists (
        select 1
          from public.users
         where id = new.user_id
    ) then
        return new;
    end if;

    -- A token that names another member makes this a mention message.
    -- Membership alone decides it: a muted member still counts.
    if exists (
        select 1
          from regexp_matches(new.content, '(?:^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]+)', 'g') as token_match
          join public.users u on u.username = token_match[1]
          join public.channel_members cm on cm.member_id = u.id and cm.channel_id = new.channel_id
         where u.id <> new.user_id
    ) then
        return new;
    end if;

    truncated_content := message_content_preview(new.content, new.medias, new.type);

    -- Reply notifications for the original-message author are emitted by
    -- create_reply_notification; do not duplicate the row here.
    insert into public.notifications (
        receiver_user_id,
        sender_user_id,
        type,
        message_id,
        channel_id,
        message_preview,
        created_at
    )
    select
        cm.member_id,
        new.user_id,
        'message'::notification_category,
        new.id,
        new.channel_id,
        truncated_content,
        timezone('utc', now())
    from public.channel_members cm
    join public.users u on u.id = cm.member_id
    where cm.channel_id = new.channel_id
      and cm.member_id  != new.user_id
      and (u.status is null or u.status != 'ONLINE')
      and cm.mute_in_app_notifications = false
      and cm.notif_state = 'ALL';

    return new;
end;
$$;

drop trigger if exists create_everyone_notifications on public.messages;
create trigger create_everyone_notifications
after insert on public.messages
for each row
when (new.content ~ '(^|[^A-Za-z0-9_-])@everyone($|[^A-Za-z0-9_-])' and new.type is distinct from 'notification')
execute function create_everyone_notifications();

comment on trigger create_everyone_notifications on public.messages is 'Creates notifications for all channel members when @everyone is used.';

-- A WHEN clause cannot hold a subquery, so it skips only @everyone here.
-- The function body skips a message whose token names another channel member.
drop trigger if exists create_regular_message_notifications on public.messages;
create trigger create_regular_message_notifications
after insert on public.messages
for each row
when (new.content !~ '(^|[^A-Za-z0-9_-])@everyone($|[^A-Za-z0-9_-])' and new.type is distinct from 'notification')
execute function create_regular_message_notifications();

comment on trigger create_regular_message_notifications on public.messages is 'Creates notifications for messages with no @everyone and no @token that names another channel member.';
