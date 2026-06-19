-- Allow creators to see all members of their groups
CREATE POLICY "GroupMembers_Select_Creator" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );
