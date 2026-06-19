-- Remove potentially recursive policies to stabilize the app
DROP POLICY IF EXISTS "GroupMembers_Select_Members" ON public.group_members;

-- Note: Now members only see themselves in group_members, and creators only see themselves.
-- But ChatList will work because it only fetches the user's own memberships.
