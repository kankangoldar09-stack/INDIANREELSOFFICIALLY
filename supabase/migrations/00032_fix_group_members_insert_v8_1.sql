-- Update Group Members policies to allow creators to add members
DROP POLICY IF EXISTS "GroupMembers_Insert_Self" ON public.group_members;
DROP POLICY IF EXISTS "GroupMembers_Delete_Self" ON public.group_members;

CREATE POLICY "GroupMembers_Insert" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );

CREATE POLICY "GroupMembers_Delete" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );
