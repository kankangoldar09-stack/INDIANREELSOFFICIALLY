import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Withdrawal {
  id: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  status: 'pending' | 'successful' | 'rejected';
  created_at: string;
}

export default function PaymentGift() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchBalance();
      fetchWithdrawals();
    }
  }, [profile]);

  const fetchBalance = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_payment_gift_balance', {
        user_uuid: profile.id
      } as any);

      if (error) throw error;
      setBalance(data || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to load balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const handleWithdraw = async () => {
    if (!profile?.id) return;
    
    const amount = parseFloat(withdrawAmount);

    if (isNaN(amount) || amount < 20) {
      toast.error('Minimum withdrawal amount is 20 rupees');
      return;
    }

    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setSubmitting(true);

    try {
      const taxAmount = amount * 0.05;
      const netAmount = amount - taxAmount;

      const { error } = await supabase.from('withdrawals').insert([{
        user_id: profile.id,
        amount,
        tax_amount: taxAmount,
        net_amount: netAmount,
        status: 'pending'
      }] as any);

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully');
      setShowWithdrawDialog(false);
      setWithdrawAmount('');
      fetchBalance();
      fetchWithdrawals();
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'successful':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500';
      case 'successful':
        return 'text-green-500';
      case 'rejected':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Payment Gift</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-semibold">Total Balance</h2>
            </div>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-4xl font-bold mb-6">
            ₹{loading ? '...' : balance.toFixed(2)}
          </div>
          <Button
            onClick={() => setShowWithdrawDialog(true)}
            disabled={balance < 20}
            className="w-full"
          >
            Withdraw Funds
          </Button>
          {balance < 20 && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Minimum balance of ₹20 required to withdraw
            </p>
          )}
        </Card>

        {/* Withdrawal History */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Withdrawal History</h2>
          {withdrawals.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No withdrawal requests yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(withdrawal.status)}
                        <span className={`text-sm font-medium capitalize ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">₹{withdrawal.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax (5%):</span>
                          <span className="font-medium">₹{withdrawal.tax_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Amount:</span>
                          <span className="font-semibold text-primary">₹{withdrawal.net_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">
                            {new Date(withdrawal.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw. Minimum withdrawal is ₹20 and 5% tax will be deducted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Withdrawal Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="20"
                step="0.01"
              />
            </div>
            {withdrawAmount && parseFloat(withdrawAmount) >= 20 && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">₹{parseFloat(withdrawAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (5%):</span>
                  <span className="font-medium">₹{(parseFloat(withdrawAmount) * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold">You will receive:</span>
                  <span className="font-semibold text-primary">
                    ₹{(parseFloat(withdrawAmount) * 0.95).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowWithdrawDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              disabled={submitting || !withdrawAmount || parseFloat(withdrawAmount) < 20}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
