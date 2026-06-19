# INDIANREELS App - Negative/Destructive Buttons HTML/JSX Code

This document contains all the negative/destructive button patterns used in the INDIANREELS app.

---

## 1. **Delete Button (Destructive Variant)**

### Red Delete Button with Icon
```jsx
<Button 
  variant="destructive" 
  size="icon" 
  className="h-8 w-8"
  onClick={() => handleDelete(id)}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

### Delete Button with Text
```jsx
<Button 
  variant="destructive"
  onClick={() => handleDeletePost(post.id)}
>
  <Trash2 className="h-4 w-4 mr-2" />
  Delete Post
</Button>
```

---

## 2. **Cancel Button (Ghost Variant)**

### Cancel Button in Dialog/Modal
```jsx
<Button 
  variant="ghost" 
  className="flex-1 h-12 rounded-xl text-white hover:bg-white/10" 
  onClick={() => setShowDialog(false)}
>
  Cancel
</Button>
```

### Cancel Button (Secondary Style)
```jsx
<Button 
  variant="outline" 
  onClick={() => handleCancel()}
>
  Cancel
</Button>
```

---

## 3. **Close Button (X Icon)**

### Close Button for Modals/Sheets
```jsx
<Button
  variant="ghost"
  size="icon"
  className="absolute top-4 right-4 h-8 w-8 rounded-full"
  onClick={onClose}
>
  <X className="h-4 w-4" />
</Button>
```

### Close Button with Background
```jsx
<button
  onClick={onClose}
  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
>
  <X className="w-5 h-5 text-white" />
</button>
```

---

## 4. **Back Button (Arrow Left)**

### Back Navigation Button
```jsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => navigate(-1)}
  className="absolute top-4 left-4 z-10"
>
  <ArrowLeft className="h-5 w-5" />
</Button>
```

### Back Button with Text
```jsx
<Button
  variant="ghost"
  onClick={() => navigate(-1)}
  className="flex items-center gap-2"
>
  <ArrowLeft className="h-4 w-4" />
  Back
</Button>
```

---

## 5. **Remove/Reject Button**

### Remove Button (Secondary)
```jsx
<Button 
  variant="secondary" 
  size="sm" 
  onClick={() => handleRemove(user.id)}
>
  Remove
</Button>
```

### Reject Call Button (Destructive)
```jsx
<Button
  variant="destructive"
  size="lg"
  className="rounded-full w-16 h-16"
  onClick={onReject}
>
  <X className="h-6 w-6" />
</Button>
```

---

## 6. **Delete with Confirmation (Dropdown Menu)**

### Delete Option in Dropdown Menu
```jsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-5 w-5" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem 
      className="text-sm text-red-500" 
      onClick={onDelete}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 7. **Glassmorphism Delete Button (Calculator Vault Style)**

### Small Rounded Delete Button with Blur Effect
```jsx
<Button 
  size="icon" 
  variant="destructive" 
  className="w-6 h-6 rounded-full bg-red-500/50 backdrop-blur-md border-none" 
  onClick={() => deleteVaultItem(item.id)}
>
  <Trash2 className="h-3 w-3" />
</Button>
```

---

## 8. **Text-Only Destructive Button**

### Red Text Button (No Background)
```jsx
<Button
  variant="ghost"
  className="text-red-500 hover:text-red-600 hover:bg-red-50"
  onClick={handleDelete}
>
  Delete
</Button>
```

---

## 9. **Icon-Only Destructive Button (Ghost)**

### Ghost Delete Button with Red Text
```jsx
<Button 
  variant="ghost" 
  size="icon" 
  className="h-8 w-8 text-destructive hover:bg-destructive/10" 
  onClick={() => handleDeletePost(post.id)}
>
  <Trash2 className="h-4 w-4" />
</Button>
```

---

## 10. **Full-Width Cancel Button (Mobile)**

### Mobile-Optimized Cancel Button
```jsx
<Button 
  variant="outline" 
  className="w-full h-12 rounded-xl" 
  onClick={() => setShowDialog(false)}
>
  Cancel
</Button>
```

---

## Button Variants Reference

### Available Variants:
- `variant="destructive"` - Red background, white text (for delete/remove actions)
- `variant="ghost"` - Transparent background, hover effect (for cancel/close)
- `variant="outline"` - Border only, transparent background (for secondary cancel)
- `variant="secondary"` - Gray background (for neutral negative actions)

### Common Icon Imports:
```jsx
import { 
  Trash2,      // Delete icon
  X,           // Close icon
  ArrowLeft,   // Back icon
  MoreVertical // More options icon
} from 'lucide-react';
```

---

## Color Classes for Destructive Actions:

- `text-red-500` - Red text color
- `text-destructive` - Theme destructive color
- `bg-red-500` - Red background
- `bg-destructive` - Theme destructive background
- `hover:bg-red-50` - Light red hover background
- `hover:bg-destructive/10` - Destructive color with 10% opacity

---

## Complete Example: Delete Confirmation Dialog

```jsx
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

// Usage
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete your post.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={handleConfirmDelete}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Notes:

1. **Always use semantic variants** - Use `variant="destructive"` for delete actions
2. **Provide visual feedback** - Use icons (Trash2, X) to make actions clear
3. **Confirm destructive actions** - Use AlertDialog for important delete operations
4. **Accessibility** - Ensure buttons have proper aria-labels for screen readers
5. **Mobile-friendly** - Use appropriate sizes (h-12 for mobile touch targets)

---

**Generated for INDIANREELS App**
**Version: v552**

---

# Complete HTML Code - All Negative Buttons

Below is the complete HTML code for all negative/destructive buttons in one place. Copy and paste directly into your HTML file.

---

## 1. Delete Button (Red Background with Icon)
```html
<button class="inline-flex items-center justify-center h-8 w-8 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>
```

---

## 2. Delete Button with Text
```html
<button class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">
  <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
  Delete Post
</button>
```

---

## 3. Cancel Button (Transparent/Ghost)
```html
<button class="h-12 px-6 rounded-xl text-gray-700 bg-transparent hover:bg-gray-100 transition-colors font-medium">
  Cancel
</button>
```

---

## 4. Cancel Button (Outline Style)
```html
<button class="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">
  Cancel
</button>
```

---

## 5. Close Button (X Icon)
```html
<button class="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100 transition-colors flex items-center justify-center">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>
```

---

## 6. Close Button with Dark Background (Glassmorphism)
```html
<button class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>
```

---

## 7. Back Button (Arrow Left Icon)
```html
<button class="h-10 w-10 rounded-md bg-transparent hover:bg-gray-100 transition-colors flex items-center justify-center">
  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
  </svg>
</button>
```

---

## 8. Back Button with Text
```html
<button class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-transparent hover:bg-gray-100 transition-colors">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
  </svg>
  Back
</button>
```

---

## 9. Remove Button (Secondary/Gray)
```html
<button class="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors font-medium">
  Remove
</button>
```

---

## 10. Reject Call Button (Large Round)
```html
<button class="rounded-full w-16 h-16 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg">
  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>
```

---

## 11. Glassmorphism Delete Button (Small)
```html
<button class="w-6 h-6 rounded-full bg-red-500/50 backdrop-blur-md border-none flex items-center justify-center hover:bg-red-500/70 transition-colors">
  <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>
```

---

## 12. Text-Only Delete Button (Red Text)
```html
<button class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-transparent text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium">
  Delete
</button>
```

---

## 13. Ghost Delete Button with Icon
```html
<button class="h-8 w-8 rounded-md bg-transparent text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center">
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>
```

---

## 14. Full-Width Cancel Button (Mobile Optimized)
```html
<button class="w-full h-12 rounded-xl border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">
  Cancel
</button>
```

---

## 15. Delete Confirmation Dialog (Complete Example)
```html
<!-- Trigger Button -->
<button onclick="document.getElementById('deleteDialog').classList.remove('hidden')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
  Show Delete Dialog
</button>

<!-- Dialog Overlay and Content -->
<div id="deleteDialog" class="hidden fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
    <!-- Header -->
    <h2 class="text-lg font-semibold mb-2">Are you sure?</h2>
    <p class="text-sm text-gray-600 mb-6">
      This action cannot be undone. This will permanently delete your post.
    </p>
    
    <!-- Footer Buttons -->
    <div class="flex gap-3 justify-end">
      <button onclick="document.getElementById('deleteDialog').classList.add('hidden')" class="px-4 py-2 rounded-md border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">
        Cancel
      </button>
      <button onclick="alert('Deleted!'); document.getElementById('deleteDialog').classList.add('hidden')" class="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">
        <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    </div>
  </div>
</div>
```

---

## Complete Page Template with All Buttons

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>INDIANREELS - Negative Buttons</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 p-8">
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8">INDIANREELS - Negative Buttons</h1>
        
        <!-- Delete Button -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Delete Button</h3>
            <button class="inline-flex items-center justify-center h-8 w-8 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>

        <!-- Delete with Text -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Delete Button with Text</h3>
            <button class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">
                <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Post
            </button>
        </div>

        <!-- Cancel Button -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Cancel Button</h3>
            <button class="h-12 px-6 rounded-xl text-gray-700 bg-transparent hover:bg-gray-100 transition-colors font-medium border border-gray-300">
                Cancel
            </button>
        </div>

        <!-- Close Button -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Close Button</h3>
            <button class="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100 transition-colors flex items-center justify-center border border-gray-300">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Back Button -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Back Button</h3>
            <button class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-transparent hover:bg-gray-100 transition-colors border border-gray-300">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>
        </div>

        <!-- Remove Button -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Remove Button</h3>
            <button class="inline-flex items-center justify-center px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors font-medium">
                Remove
            </button>
        </div>

        <!-- Reject Call Button -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Reject Call Button</h3>
            <button class="rounded-full w-16 h-16 bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center shadow-lg">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Text-Only Delete -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Text-Only Delete Button</h3>
            <button class="inline-flex items-center justify-center px-4 py-2 rounded-md bg-transparent text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium">
                Delete
            </button>
        </div>

        <!-- Full-Width Cancel -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Full-Width Cancel Button</h3>
            <button class="w-full h-12 rounded-xl border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">
                Cancel
            </button>
        </div>

        <!-- Delete Dialog -->
        <div class="mb-6">
            <h3 class="font-semibold mb-2">Delete Confirmation Dialog</h3>
            <button onclick="document.getElementById('deleteDialog').classList.remove('hidden')" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Show Delete Dialog
            </button>
        </div>
    </div>

    <!-- Dialog -->
    <div id="deleteDialog" class="hidden fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 class="text-lg font-semibold mb-2">Are you sure?</h2>
            <p class="text-sm text-gray-600 mb-6">
                This action cannot be undone. This will permanently delete your post.
            </p>
            <div class="flex gap-3 justify-end">
                <button onclick="document.getElementById('deleteDialog').classList.add('hidden')" class="px-4 py-2 rounded-md border border-gray-300 bg-transparent hover:bg-gray-100 transition-colors font-medium">
                    Cancel
                </button>
                <button onclick="alert('Deleted!'); document.getElementById('deleteDialog').classList.add('hidden')" class="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    </div>
</body>
</html>
```

---

## Tailwind CSS Classes Quick Reference

### Red/Destructive Colors
- `bg-red-600` - Red background
- `bg-red-700` - Darker red (hover)
- `text-red-500` - Red text
- `text-red-600` - Darker red text
- `hover:bg-red-50` - Light red hover background
- `hover:bg-red-100` - Medium red hover background

### Gray/Neutral Colors
- `bg-gray-200` - Light gray background
- `bg-gray-300` - Medium gray background
- `text-gray-600` - Gray text
- `text-gray-700` - Darker gray text
- `text-gray-900` - Very dark gray text
- `border-gray-300` - Gray border

### Transparent/Glass Effects
- `bg-black/50` - 50% transparent black
- `bg-white/10` - 10% transparent white
- `bg-red-500/50` - 50% transparent red
- `backdrop-blur-sm` - Small blur effect
- `backdrop-blur-md` - Medium blur effect

### Common Utilities
- `transition-colors` - Smooth color transitions
- `hover:bg-gray-100` - Light gray on hover
- `rounded-md` - Medium border radius
- `rounded-xl` - Extra large border radius
- `rounded-full` - Fully rounded (circle)
- `shadow-lg` - Large shadow
- `inline-flex` - Inline flex container
- `items-center` - Center items vertically
- `justify-center` - Center items horizontally
- `gap-2` / `gap-3` - Space between flex items

---

**End of Document**
**INDIANREELS App - Version v552**
**All HTML code ready to use!**
