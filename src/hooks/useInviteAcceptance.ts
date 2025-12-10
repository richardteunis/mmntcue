import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that checks for pending guest invitations when user logs in
 * and sends notification emails to inviters when invites are accepted
 */
export function useInviteAcceptance(userId: string | null, userEmail: string | null, userName: string | null) {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!userId || !userEmail || hasChecked.current) return;

    const checkAndAcceptInvites = async () => {
      hasChecked.current = true;
      
      try {
        // Find any pending guest invitations for this email
        const { data: pendingInvites, error: fetchError } = await supabase
          .from('show_members')
          .select(`
            id,
            show_id,
            role,
            invited_by,
            shows!inner(id, name)
          `)
          .eq('guest_email', userEmail.toLowerCase())
          .is('user_id', null);

        if (fetchError) {
          console.error('Error fetching pending invites:', fetchError);
          return;
        }

        if (!pendingInvites || pendingInvites.length === 0) {
          return;
        }

        console.log(`Found ${pendingInvites.length} pending invite(s) for ${userEmail}`);

        // Get session for auth header
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Process each pending invite
        for (const invite of pendingInvites) {
          // Update the invite to link to the user
          const { error: updateError } = await supabase
            .from('show_members')
            .update({
              user_id: userId,
              accepted_at: new Date().toISOString(),
              guest_email: null // Clear guest_email since user is now linked
            })
            .eq('id', invite.id);

          if (updateError) {
            console.error('Error accepting invite:', updateError);
            continue;
          }

          console.log(`Accepted invite for show ${invite.show_id}`);

          // Send notification to inviter if there is one
          if (invite.invited_by) {
            // Get inviter's profile
            const { data: inviterProfile } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', invite.invited_by)
              .single();

            if (inviterProfile?.email) {
              const showName = (invite.shows as any)?.name || 'an event';
              const siteUrl = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '') || '';
              const actionUrl = `${window.location.origin}/show/${invite.show_id}`;

              try {
                await supabase.functions.invoke('send-notification-email', {
                  body: {
                    email: inviterProfile.email,
                    type: 'invite_accepted',
                    userName: inviterProfile.full_name || inviterProfile.email.split('@')[0],
                    acceptedByName: userName || userEmail.split('@')[0],
                    eventName: showName,
                    actionUrl
                  }
                });
                console.log(`Sent invite accepted notification to ${inviterProfile.email}`);
              } catch (emailError) {
                console.error('Error sending invite accepted email:', emailError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in invite acceptance check:', error);
      }
    };

    checkAndAcceptInvites();
  }, [userId, userEmail, userName]);
}
