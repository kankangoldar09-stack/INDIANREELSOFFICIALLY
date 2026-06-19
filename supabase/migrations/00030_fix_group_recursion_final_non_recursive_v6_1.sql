-- Clear all policies for groups and group_members to start fresh
DROP POLICY IF EXISTS "Select Groups" ON public.groups;
DROP POLICY IF EXISTS "Insert Groups" ON public.groups;
DROP POLICY IF EXISTS "Select Group Members" ON public.group_members;
DROP POLICY IF EXISTS "Insert Group Members" ON public.group_members;
DROP POLICY IF EXISTS "Delete Group Members" ON public.group_members;

-- GROUPS: Creators see their groups, members see groups via memberships
CREATE POLICY "Groups_Select" ON public.groups FOR SELECT USING (
  creator_id = auth.uid() OR 
  id IN (SELECT m.group_id FROM public.group_members m WHERE m.user_id = auth.uid())
);
CREATE POLICY "Groups_Insert" ON public.groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- GROUP MEMBERS: Everyone can see their own membership (non-recursive)
CREATE POLICY "GroupMembers_Select" ON public.group_members FOR SELECT USING (
  user_id = auth.uid()
);
-- Creators can also see memberships in their groups (non-recursive because groups policy above doesn't check group_members for creator_id = auth.uid())
CREATE POLICY "GroupMembers_Select_Creator" ON public.group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);

-- Insert/Delete:
CREATE POLICY "GroupMembers_Insert" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);
CREATE POLICY "GroupMembers_Delete" ON public.group_members FOR DELETE USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
);
