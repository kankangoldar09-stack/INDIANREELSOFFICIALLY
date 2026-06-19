-- Clear all policies for groups and group_members to start fresh
DROP POLICY IF EXISTS "Users can view groups they are in" ON public.groups;
DROP POLICY IF EXISTS "Any user can create a group" ON public.groups;
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Creators can add members" ON public.group_members;
DROP POLICY IF EXISTS "Members can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can view memberships" ON public.group_members;
DROP POLICY IF EXISTS "Members can view each other" ON public.group_members;

-- GROUPS
CREATE POLICY "Select Groups" ON public.groups
  FOR SELECT USING (
    creator_id = auth.uid() OR 
    id IN (SELECT m.group_id FROM public.group_members m WHERE m.user_id = auth.uid())
  );

CREATE POLICY "Insert Groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- GROUP MEMBERS
CREATE POLICY "Select Group Members" ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );

CREATE POLICY "Insert Group Members" ON public.group_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );

CREATE POLICY "Delete Group Members" ON public.group_members
  FOR DELETE USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.creator_id = auth.uid())
  );
