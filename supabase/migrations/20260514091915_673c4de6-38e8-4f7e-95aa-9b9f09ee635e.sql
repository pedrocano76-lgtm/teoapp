
-- Reschedule the daily reminder cron to send the CRON_SECRET header so the
-- newly-gated edge function authorizes it.
DO $$
DECLARE
  jid bigint;
  secret text;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'send-photo-reminders-daily';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;

  BEGIN
    secret := vault.read_secret('CRON_SECRET');
  EXCEPTION WHEN OTHERS THEN
    secret := NULL;
  END;

  PERFORM cron.schedule(
    'send-photo-reminders-daily',
    '0 9 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://ccqmucxgsrgpgpsiwiqc.supabase.co/functions/v1/send-photo-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $cron$, COALESCE(secret, ''))
  );
END $$;

-- Lock down SECURITY DEFINER helpers from anonymous execution.
REVOKE EXECUTE ON FUNCTION public.can_access_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_edit_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_parent_of_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_guest_of_child(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_display_name(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.can_access_child(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_child(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_parent_of_child(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_guest_of_child(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_display_name(uuid) TO authenticated, service_role;
