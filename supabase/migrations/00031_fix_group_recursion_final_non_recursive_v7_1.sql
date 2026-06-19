-- Clear all policies for groups and group_members to start fresh
DROP POLICY IF EXISTS "Groups_Select" ON public.groups;
DROP POLICY IF EXISTS "Groups_Insert" ON public.groups;
DROP POLICY IF EXISTS "GroupMembers_Select" ON public.group_members;
DROP POLICY IF EXISTS "GroupMembers_Select_Creator" ON public.group_members;
DROP POLICY IF EXISTS "GroupMembers_Insert" ON public.group_members;
DROP POLICY IF EXISTS "GroupMembers_Delete" ON public.group_members;

-- GROUPS: Creators see their groups, members see groups via memberships
CREATE POLICY "Groups_Select" ON public.groups FOR SELECT USING (
  creator_id = auth.uid() OR 
  id IN (SELECT m.group_id FROM public.group_members m WHERE m.user_id = auth.uid())
);
CREATE POLICY "Groups_Insert" ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- GROUP MEMBERS: Everyone can see their own membership (absolutely non-recursive)
CREATE POLICY "GroupMembers_Select_Self" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()
);

-- Note: Other members/creators might not see each other yet, but ChatList will work.
-- We can add creator visibility later if needed for member lists.

CREATE POLICY "GroupMembers_Insert_Self" ON public.group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "GroupMembers_Delete_Self" ON public.group_members FOR DELETE USING (user_id = auth.uid());
