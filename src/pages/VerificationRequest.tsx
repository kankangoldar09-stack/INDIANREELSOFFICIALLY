import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BadgeCheck, ShieldCheck, UserCheck, ChevronLeft } from 'lucide-react';
import IndianSpinner from '@/components/ui/IndianSpinner';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function VerificationRequestPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');

  useEffect(() => {
    checkStatus();
  }, [profile]);

  const checkStatus = async () => {
    if (!profile) return;
    const { data }: any = await supabase
      .from('verification_requests' as any)
      .select('status')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) setStatus(data.status);
    else if (profile.is_verified) setStatus('approved');
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await (supabase as any).from('verification_requests').insert({
        user_id: profile.id,
        status: 'pending'
      });
      if (error) throw error;
      setStatus('pending');
      toast.success('Verification request submitted successfully');
    } catch (error: any) {
      toast.error(`Submission failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Verified Badge</h1>
      </div>

      <div className="flex flex-col items-center text-center space-y-4 py-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <VerificationBadge size={25} />
        </div>
        <h2 className="text-2xl font-bold">Apply for Verification</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          A verified badge is a check that appears next to an account's name to indicate that the account is the authentic presence of a notable public figure, celebrity, or global brand.
        </p>
      </div>

      <Card className="border dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Requirements</CardTitle>
          <CardDescription>To be verified, your account must meet these criteria:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <UserCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Authentic</p>
              <p className="text-xs text-muted-foreground">Represent a real person, registered business or entity.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Unique</p>
              <p className="text-xs text-muted-foreground">Be the unique presence of the person or business it represents.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <BadgeCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Complete</p>
              <p className="text-xs text-muted-foreground">Your account must be public and have a bio, profile photo and at least one post.</p>
            </div>
          </div>

          <div className="pt-6 border-t dark:border-zinc-800">
            {status === 'pending' ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-4 rounded-lg text-center font-medium">
                Your request is currently under review.
              </div>
            ) : status === 'approved' ? (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg text-center font-medium flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Your account is verified!
              </div>
            ) : (
              <Button 
                className="w-full" 
                size="lg" 
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading && <IndianSpinner size="sm" className="mr-2" />}
                Apply Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
