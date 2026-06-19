import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft, Camera } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import CropModal from '@/components/profile/CropModal';

const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara",
  "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi",
  "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur",
  "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati", "Solapur", "Hubli-Dharwad",
  "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur", "Moradabad", "Jalandhar", "Bhubaneswar", "Salem", "Warangal",
  "Mira-Bhayandar", "Thiruvananthapuram", "Bhiwandi", "Saharanpur", "Guntur", "Amravati", "Bikaner", "Noida", "Jamshedpur", "Bhilai",
  "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded",
  "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar",
  "Jammu", "Sangli-Miraj & Kupwad", "Mangalore", "Erode", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon", "Gaya", "Jalgaon",
  "Udaipur", "Maheshtala", "Tirupur", "Davanagere", "Kozhikode", "Akola", "Kurnool", "Rajamahendravaram", "Bokaro Steel City", "South Dumdum",
  "Bellary", "Patiala", "Gopalpur", "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur", "Dhule",
  "Rohtak", "Korba", "Bhilwara", "Brahmapur", "Muzaffarpur", "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa",
  "Kamarhati", "Sambalpur", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur", "Shivamogga", "Chandrapur", "Junagadh",
  "Thrissur", "Alwar", "Siwan", "Bhiwani", "Katihar", "Khandwa", "Rewa", "Munger", "Purnia", "Panvel"
];

export default function EditProfile() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [city, setCity] = useState(profile?.city || '');
  const [dob, setDob] = useState(profile?.dob || '');
  const [note, setNote] = useState((profile as any)?.note || '');
  const [category, setCategory] = useState((profile as any)?.category || '');
  const [threadsUsername, setThreadsUsername] = useState((profile as any)?.threads_username || '');
  const [musicTitle, setMusicTitle] = useState((profile as any)?.music_title || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async () => {
    if (!profile) {
      toast.error('No profile loaded');
      return;
    }
    
    setLoading(true);
    console.log('Starting profile update for user:', profile.id);
    console.log('Current values:', { fullName, username, bio, city, dob });

    try {
      // Check username uniqueness if changed
      if (username !== profile.username) {
        console.log('Username changed, checking uniqueness...');
        
        const { data: existing, error: checkError }: any = await (supabase as any)
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error checking username:', checkError);
          throw new Error(`Username check failed: ${checkError.message}`);
        }
        
        if (existing) {
          toast.error('Username already taken');
          setLoading(false);
          return;
        }

        // Check if username was previously used by this user
        console.log('Checking username history...');
        const { data: historyCheck, error: historyCheckError }: any = await (supabase as any)
          .from('username_history')
          .select('username')
          .eq('user_id', profile.id)
          .eq('username', username)
          .maybeSingle();

        if (historyCheckError) {
          console.error('Error checking username history:', historyCheckError);
          // Don't fail on history check error, just log it
        }

        if (historyCheck) {
          toast.error('You cannot reuse a previous username');
          setLoading(false);
          return;
        }

        // Insert new username into history
        console.log('Inserting username into history...');
        const { error: historyError } = await (supabase as any)
          .from('username_history')
          .insert({ 
            user_id: profile.id, 
            username: username,
            changed_at: new Date().toISOString()
          } as any);

        if (historyError) {
          console.error('Username history insert error:', historyError);
          // Don't fail on history insert error, just log it
        }
      }

      // Update profile
      console.log('Updating profile...');
      const updateData = { 
        full_name: fullName || null, 
        username: username, 
        bio: bio || null, 
        city: city || null, 
        dob: dob || null,
        note: note || null,
        category: category || null,
        threads_username: threadsUsername || null,
        music_title: musicTitle || null
      };
      
      console.log('Update data:', updateData);
      
      const { data: updateResult, error: updateError } = await (supabase as any)
        .from('profiles')
        .update(updateData as any)
        .eq('id', profile.id)
        .select();

      if (updateError) {
        console.error('Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      console.log('Update successful:', updateResult);
      await refreshProfile();
      toast.success('Profile updated successfully');
      navigate(-1);
    } catch (error: any) {
      console.error('Profile update failed:', error);
      toast.error(error.message || 'Update failed: Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImage(null);
    if (!profile) return;

    setUploading(true);
    try {
      const fileName = `${profile.id}_${Date.now()}.jpg`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadError } = await (supabase as any)
        .storage
        .from('media')
        .upload(filePath, croppedBlob, { contentType: 'image/jpeg', upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: urlData } = (supabase as any)
        .storage
        .from('media')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ profile_photo_url: publicUrl } as any)
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Photo updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex items-center gap-4 p-4 border-b sticky top-0 bg-background z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      <div className="flex flex-col items-center gap-4 py-8 border-b">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile?.profile_photo_url || ''} />
            <AvatarFallback className="text-2xl">{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                <IndianSpinner size="md" />
              </div>
            )}
          </Avatar>
          <button 
            className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-105 transition-transform"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        <div className="text-center">
          <p className="font-bold text-sm">@{profile?.username}</p>
          <p className="text-xs text-muted-foreground">Change profile photo</p>
        </div>
      </div>

      {selectedImage && (
        <CropModal 
          image={selectedImage} 
          onCrop={handleCropComplete} 
          onCancel={() => setSelectedImage(null)} 
        />
      )}

      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <p className="text-[10px] text-muted-foreground">In most cases, you'll be able to change your username back to {profile?.username} for another 14 days.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" className="h-24 resize-none" value={bio} onChange={(e) => setBio(e.target.value)} />
          <p className="text-[10px] text-muted-foreground text-right">{bio.length} / 150</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger>
              <SelectValue placeholder="Select your city" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {INDIAN_CITIES.map((cityName) => (
                <SelectItem key={cityName} value={cityName}>
                  {cityName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Profile Note (Bubble)</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Unpopular opinion..." maxLength={30} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Editor / Artist / Blogger" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="threads">Threads Username</Label>
          <Input id="threads" value={threadsUsername} onChange={(e) => setThreadsUsername(e.target.value)} placeholder="@username" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="music">Music Track Title</Label>
          <Input id="music" value={musicTitle} onChange={(e) => setMusicTitle(e.target.value)} placeholder="Song name · Artist" />
        </div>

        <div className="pt-4">
          <Button className="w-full" size="lg" disabled={loading} onClick={handleUpdate}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
