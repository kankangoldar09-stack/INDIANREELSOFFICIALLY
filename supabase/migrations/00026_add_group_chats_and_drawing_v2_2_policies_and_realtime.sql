-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view groups they are in" ON public.groups;
CREATE POLICY "Users can view groups they are in" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = public.groups.id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Any user can create a group" ON public.groups;
CREATE POLICY "Any user can create a group" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
CREATE POLICY "Group members can view other members" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members AS m
      WHERE m.group_id = public.group_members.group_id AND m.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Creators can add members" ON public.group_members;
CREATE POLICY "Creators can add members" ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups
      WHERE id = group_id AND creator_id = auth.uid()
    ) OR user_id = auth.uid()
  );
DROP POLICY IF EXISTS "Members can leave groups" ON public.group_members;
CREATE POLICY "Members can leave groups" ON public.group_members
  FOR DELETE USING (user_id = auth.uid());

-- Enable Realtime for groups and members
ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
