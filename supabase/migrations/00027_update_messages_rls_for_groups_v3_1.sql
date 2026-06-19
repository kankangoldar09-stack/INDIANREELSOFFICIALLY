-- Drop old policy
DROP POLICY IF EXISTS "Messages private to participants" ON public.messages;

-- Create new policy that supports both individual and group chats
CREATE POLICY "Users can view messages they participated in or are group members of" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR 
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = public.messages.group_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can send messages to individuals or groups" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      receiver_id IS NOT NULL OR (
        group_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.group_members 
          WHERE group_id = public.messages.group_id AND user_id = auth.uid()
        )
      )
    )
  );
