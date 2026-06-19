-- Allow all members of a group to see each other (by checking groups SELECT policy)
DROP POLICY IF EXISTS "GroupMembers_Select_Creator" ON public.group_members;

CREATE POLICY "GroupMembers_Select_Members" ON public.group_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id)
  );
