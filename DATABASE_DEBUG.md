# Database Update Troubleshooting Guide

## Current Status
All database policies are correctly configured:
- ✅ Profiles table has proper RLS policies for SELECT, INSERT, and UPDATE
- ✅ Username_history table has proper INSERT policy
- ✅ Storage bucket 'media' is public with proper upload policies
- ✅ All TypeScript compilation passes without errors

## Policies in Place

### Profiles Table
1. **Public profiles are viewable** (SELECT) - Anyone can read profiles
2. **Users can insert own profile** (INSERT) - Authenticated users can create their profile
3. **Users can update own profile** (UPDATE) - Users can only update their own profile (auth.uid() = id)

### Username_history Table
1. **Username history private to owner** (SELECT) - Users can only read their own history
2. **Users can insert own username history** (INSERT) - Users can add to their own history

### Storage (media bucket)
1. **Public read for media** (SELECT) - Anyone can read files
2. **Authenticated users can upload media** (INSERT) - Logged-in users can upload
3. **Users can update own media** (UPDATE) - Users can update their own files
4. **Users can delete own media** (DELETE) - Users can delete their own files

## Enhanced Error Logging
The EditProfile.tsx component now includes:
- Detailed console logging at every step
- Specific error messages with error codes, details, and hints
- Validation checks before operations
- Graceful error handling for non-critical operations (username history)

## Testing Steps
1. Open browser console (F12)
2. Navigate to Edit Profile page
3. Make changes and click Save
4. Check console for detailed error messages
5. Report the exact error message shown in console

## Common Issues and Solutions

### Issue: "new row violates row-level security policy"
**Solution**: User is not authenticated or session expired
- Check if user is logged in
- Try logging out and back in
- Check browser console for auth.uid()

### Issue: "duplicate key value violates unique constraint"
**Solution**: Username already exists
- Try a different username
- Check if username was previously used

### Issue: "permission denied for table profiles"
**Solution**: RLS policy not matching
- Verify user is authenticated
- Check that auth.uid() matches profile.id

### Issue: Storage upload fails
**Solution**: Check file size and type
- Maximum file size: Check bucket limits
- Allowed types: images (jpg, png, gif, webp)
- Check storage bucket policies

## Debug Commands
Run these in browser console when logged in:

```javascript
// Check current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check current profile
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
console.log('Profile:', data, 'Error:', error);

// Test update
const { data: updated, error: updateError } = await supabase
  .from('profiles')
  .update({ bio: 'Test update' })
  .eq('id', user.id)
  .select();
console.log('Update result:', updated, 'Error:', updateError);
```
