import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Flag, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';


export default function ReportPage() {
  const navigate = useNavigate();
  const [reportStep, setReportStep] = useState<'reason' | 'details' | 'success'>('reason');
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const reportReasons = [
    { title: "Spam or Scam", description: "Misleading, fraudulent, or commercial content" },
    { title: "Nudity or sexual activity", description: "Sexually explicit content or imagery" },
    { title: "Hate speech or symbols", description: "Discriminatory text, symbols, or behavior" },
    { title: "Bullying or harassment", description: "Targeted abuse or mean comments" },
    { title: "Violence or dangerous organizations", description: "Graphic violence, threats, or criminal groups" },
    { title: "False information", description: "Harmful misinformation or fake news" },
    { 
      title: "Justice for me", 
      description: "Help with delivery status, refund, or payment issues", 
      highlight: true 
    },
    { title: "I just don't like it", description: "Content that you prefer not to see" }
  ];

  const handleReasonSelect = (title: string) => {
    if (title === "Justice for me") {
      toast.info("Redirecting to Help Centre for delivery, refund & payment support...");
      navigate('/settings/help');
    } else {
      setReportReason(title);
      setReportStep('details');
    }
  };

  const { profile } = useAuth();

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) return;
    if (!profile) {
      toast.error('Please log in to submit a report.');
      return;
    }
    setSubmittingReport(true);
    
    try {
      const reportPayload = {
        type: 'video_report',
        reporter_username: profile.username,
        reason: reportReason,
        description: reportDetails.trim()
      };

      const { error } = await (supabase as any)
        .from('feedback')
        .insert({
          user_id: profile.id,
          subject: `Video Report: ${reportReason}`,
          message: JSON.stringify(reportPayload),
          status: 'pending'
        });

      if (error) throw error;

      setReportStep('success');
      toast.success('Report submitted successfully.');
      setTimeout(() => {
        navigate(-1);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to submit report: ${err.message}`);
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-50 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            if (reportStep === 'details') {
              setReportStep('reason');
              setReportReason(null);
            } else {
              navigate(-1);
            }
          }}
          className="rounded-full"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
          <Flag className="w-5 h-5 text-rose-500 fill-rose-500" />
          Report a Problem
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {reportStep === 'reason' && (
            <motion.div 
              key="reason"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">Select a reason</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the option that best describes the issue you are experiencing.
                </p>
              </div>

              <div className="space-y-3">
                {reportReasons.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleReasonSelect(item.title)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.99] flex items-center justify-between group gap-4 ${
                      item.highlight 
                        ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 hover:border-rose-500/50" 
                        : "bg-card hover:bg-accent border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={`text-base font-extrabold flex items-center gap-2 ${
                        item.highlight ? "text-rose-500" : "text-foreground"
                      }`}>
                        {item.title}
                        {item.highlight && (
                          <span className="text-[10px] bg-rose-500 text-white font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
                            Help
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">{item.description}</span>
                    </div>
                    <ArrowRight className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1 ${
                      item.highlight ? "text-rose-500" : "text-muted-foreground"
                    }`} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {reportStep === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pt-2"
            >
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Reason Selected</span>
                <h3 className="text-lg font-black text-rose-500 mt-1 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {reportReason}
                </h3>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Explain the details</label>
                  <Textarea
                    placeholder="Tell us what is not working or what the issue is..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="min-h-[180px] bg-card border-border rounded-2xl resize-none focus-visible:ring-rose-500 text-base"
                    maxLength={500}
                    required
                  />
                  <div className="text-right text-xs text-muted-foreground font-mono">
                    {reportDetails.length}/500
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReportStep('reason');
                      setReportReason(null);
                    }}
                    className="flex-1 h-12 rounded-xl font-bold border-border"
                    disabled={submittingReport}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingReport || !reportDetails.trim()}
                    className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
                  >
                    {submittingReport ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {reportStep === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-lg shadow-green-500/5">
                <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-foreground">Report Submitted</h3>
                <p className="text-sm text-muted-foreground px-6 leading-relaxed max-w-sm mx-auto">
                  Thank you for your feedback! Our team will review your report shortly. Returning to previous page...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
