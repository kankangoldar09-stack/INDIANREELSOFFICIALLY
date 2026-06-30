import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Copy, Check } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Voucher {
  id: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  expiration_date: string | null;
  max_claims: number;
  current_claims: number;
  is_active: boolean;
  created_at: string;
}

interface UserVoucher {
  id: string;
  user_id: string;
  voucher_id: string;
  claimed_at: string;
  status: string;
  vouchers?: Voucher;
}

export default function VoucherReward() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [claimedVouchers, setClaimedVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const snowContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVouchers();
    fetchClaimedVouchers();
    
    // Snow animation
    const snowInterval = setInterval(() => {
      createSnowflake();
    }, 100);

    return () => clearInterval(snowInterval);
  }, []);

  const createSnowflake = () => {
    if (!snowContainerRef.current) return;
    
    const snowflake = document.createElement('div');
    snowflake.innerHTML = '❄';
    snowflake.className = 'snowflake';
    snowflake.style.left = Math.random() * 100 + 'vw';
    snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';
    snowflake.style.opacity = String(Math.random());
    snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
    
    snowContainerRef.current.appendChild(snowflake);
    
    setTimeout(() => {
      snowflake.remove();
    }, 5000);
  };

  const fetchVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data || []);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      toast.error('Unable to load vouchers. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimedVouchers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_vouchers')
        .select('*, vouchers(*)')
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false });

      if (error) throw error;
      setClaimedVouchers(data || []);
    } catch (error) {
      console.error('Error fetching claimed vouchers:', error);
    }
  };

  const handleClaimVoucher = async (voucherId: string) => {
    if (!user) {
      toast.error('Please log in to claim vouchers');
      return;
    }

    // Check if already claimed
    const alreadyClaimed = claimedVouchers.some(cv => cv.voucher_id === voucherId);
    if (alreadyClaimed) {
      toast.error('You have already claimed this voucher');
      return;
    }

    setClaimingId(voucherId);

    try {
      // Check if voucher is still available
      const voucher = vouchers.find(v => v.id === voucherId);
      if (!voucher) {
        toast.error('Voucher not found');
        return;
      }

      if (voucher.max_claims > 0 && voucher.current_claims >= voucher.max_claims) {
        toast.error('This voucher is no longer available');
        return;
      }

      if (voucher.expiration_date && new Date(voucher.expiration_date) < new Date()) {
        toast.error('This voucher has expired');
        return;
      }

      // Claim the voucher
      const { error: claimError } = await (supabase as any)
        .from('user_vouchers')
        .insert({
          user_id: user.id,
          voucher_id: voucherId,
          status: 'claimed'
        });

      if (claimError) {
        if (claimError.code === '23505') {
          toast.error('You have already claimed this voucher');
        } else {
          throw claimError;
        }
        return;
      }

      // Update voucher claim count
      const { error: updateError } = await (supabase as any)
        .from('vouchers')
        .update({ current_claims: voucher.current_claims + 1 })
        .eq('id', voucherId);

      if (updateError) throw updateError;

      toast.success('Voucher claimed successfully!', {
        description: 'Flip the card to see your credentials'
      });

      // Refresh data
      fetchVouchers();
      fetchClaimedVouchers();
    } catch (error) {
      console.error('Error claiming voucher:', error);
      toast.error('Unable to claim voucher. Please check your connection and try again.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success('Copied to clipboard!');
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    });
  };

  const isVoucherClaimed = (voucherId: string) => {
    return claimedVouchers.some(cv => cv.voucher_id === voucherId);
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Snow Animation Container */}
      <div 
        ref={snowContainerRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-10"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />

      <style>{`
        .snowflake {
          position: absolute;
          top: -10px;
          color: white;
          animation: fall linear infinite;
          pointer-events: none;
        }
        
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0.3; }
        }
        
        .flip-card {
          perspective: 1200px;
          width: 100%;
          max-width: 330px;
          height: 490px;
          margin: 0 auto;
        }
        
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
        }
        
        .flip-card:hover .flip-card-inner {
          transform: rotateY(180deg);
        }
        
        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 25px;
          border: 2px solid rgba(255, 215, 0, 0.4);
          overflow: hidden;
        }
        
        .flip-card-front {
          background: linear-gradient(135deg, #8b0000 0%, #3a0000 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .flip-card-back {
          background: url('https://dl.tgxlink.eu.org/dl/AAAAAghN1vBXyL6_G2sOZA/Uh0FovFmZ_rlJYO60bdHWwFjMQ6p8KvpVTLVoCqSSDQ') no-repeat center center;
          background-size: cover;
          transform: rotateY(180deg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .glass-panel {
          width: 85%;
          padding: 30px 15px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
          text-align: center;
        }
        
        .steam-logo-front {
          width: 140px;
          filter: drop-shadow(0 0 10px rgba(255,255,255,0.3));
        }
        
        .brand-text {
          font-size: 35px;
          color: #ffd700;
          margin: 10px 0 0;
          letter-spacing: 4px;
          font-weight: bold;
        }
        
        .gta-sticker {
          width: 150px;
          margin-bottom: 20px;
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
          transition: transform 0.3s;
        }
        
        .gta-sticker:hover {
          transform: scale(1.1);
        }
        
        .data-row {
          margin-bottom: 18px;
          text-align: left;
        }
        
        .label {
          font-size: 10px;
          color: #ffd700;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 1px;
          margin-left: 5px;
        }
        
        .value-box {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 12px;
          margin-top: 6px;
          border: 1px solid rgba(255, 215, 0, 0.3);
          overflow: hidden;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }
        
        .value {
          font-size: 13px;
          color: #fff;
          padding: 12px;
          flex-grow: 1;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .copy-btn {
          background: linear-gradient(135deg, #ffd700, #b8860b);
          color: #000;
          border: none;
          padding: 12px 15px;
          cursor: pointer;
          font-size: 10px;
          font-weight: bold;
          transition: 0.3s;
        }
        
        .copy-btn:hover {
          filter: brightness(1.2);
        }
        
        .copy-btn.copied {
          background: #28a745;
          color: #fff;
        }
      `}</style>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border shrink-0">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Voucher Rewards</h1>
            <p className="text-sm text-muted-foreground">Claim exclusive rewards and benefits</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-20 pb-24">
        {/* Show only claimed voucher if user has claimed, otherwise show available voucher */}
        {claimedVouchers.length > 0 ? (
          /* Claimed Vouchers */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">My Claimed Voucher</h2>
            </div>

            <div className="space-y-6">
              {claimedVouchers.slice(0, 1).map(userVoucher => (
                <div key={userVoucher.id} className="flip-card">
                  <div className="flip-card-inner">
                    {/* Front Side */}
                    <div className="flip-card-front">
                      <img 
                        src="https://1000logos.net/wp-content/uploads/2020/08/Steam-Logo.png" 
                        alt="Steam Logo" 
                        className="steam-logo-front"
                      />
                      <h1 className="brand-text">STREAM</h1>
                      <p style={{ color: 'white', fontSize: '12px', opacity: 0.8, letterSpacing: '2px' }}>
                        CLAIMED - HOVER TO VIEW
                      </p>
                      <div style={{ marginTop: '20px', color: '#ffd700', fontSize: '10px' }}>
                        <Check className="w-6 h-6 mx-auto mb-2" />
                        <p>CLAIMED</p>
                      </div>
                    </div>

                    {/* Back Side */}
                    <div className="flip-card-back">
                      <div className="glass-panel">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/fr/thumb/d/d5/Grand_Theft_Auto_V_Logo.svg/1280px-Grand_Theft_Auto_V_Logo.svg.png" 
                          alt="GTA V" 
                          className="gta-sticker"
                        />
                        
                        <div className="data-row">
                          <span className="label">STREAM ID</span>
                          <div className="value-box">
                            <span className="value">muqy37399</span>
                            <button 
                              className={`copy-btn ${copiedField === `claimed-id-${userVoucher.id}` ? 'copied' : ''}`}
                              onClick={() => handleCopy('muqy37399', `claimed-id-${userVoucher.id}`)}
                            >
                              {copiedField === `claimed-id-${userVoucher.id}` ? 'DONE' : 'COPY'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="data-row">
                          <span className="label">PASSWORD</span>
                          <div className="value-box">
                            <span className="value">aj6ry4y7c</span>
                            <button 
                              className={`copy-btn ${copiedField === `claimed-pass-${userVoucher.id}` ? 'copied' : ''}`}
                              onClick={() => handleCopy('aj6ry4y7c', `claimed-pass-${userVoucher.id}`)}
                            >
                              {copiedField === `claimed-pass-${userVoucher.id}` ? 'DONE' : 'COPY'}
                            </button>
                          </div>
                        </div>
                        
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', marginTop: '10px' }}>
                          Enjoy your Gift!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Available Vouchers */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Available Vouchers</h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-muted-foreground mb-4 mx-auto" />
                <p className="text-muted-foreground">No vouchers available at this time. Check back later.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {vouchers.slice(0, 1).map(voucher => {
                const claimed = isVoucherClaimed(voucher.id);

                return (
                  <div key={voucher.id} className="flip-card">
                    <div className="flip-card-inner">
                      {/* Front Side */}
                      <div className="flip-card-front">
                        <img 
                          src="https://1000logos.net/wp-content/uploads/2020/08/Steam-Logo.png" 
                          alt="Steam Logo" 
                          className="steam-logo-front"
                        />
                        <h1 className="brand-text">STREAM</h1>
                        <p style={{ color: 'white', fontSize: '12px', opacity: 0.8, letterSpacing: '2px' }}>
                          {claimed ? 'CLAIMED - HOVER TO VIEW' : 'HOVER TO CLAIM'}
                        </p>
                        {!claimed && (
                          <Button
                            onClick={() => handleClaimVoucher(voucher.id)}
                            disabled={claimingId === voucher.id}
                            style={{
                              marginTop: '20px',
                              background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                              color: '#000',
                              fontWeight: 'bold',
                              padding: '12px 24px',
                              borderRadius: '12px'
                            }}
                          >
                            {claimingId === voucher.id ? 'CLAIMING...' : 'CLAIM NOW'}
                          </Button>
                        )}
                      </div>

                      {/* Back Side */}
                      <div className="flip-card-back">
                        <div className="glass-panel">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/fr/thumb/d/d5/Grand_Theft_Auto_V_Logo.svg/1280px-Grand_Theft_Auto_V_Logo.svg.png" 
                            alt="GTA V" 
                            className="gta-sticker"
                          />
                          
                          {claimed ? (
                            <>
                              <div className="data-row">
                                <span className="label">STREAM ID</span>
                                <div className="value-box">
                                  <span className="value">muqy37399</span>
                                  <button 
                                    className={`copy-btn ${copiedField === `id-${voucher.id}` ? 'copied' : ''}`}
                                    onClick={() => handleCopy('muqy37399', `id-${voucher.id}`)}
                                  >
                                    {copiedField === `id-${voucher.id}` ? 'DONE' : 'COPY'}
                                  </button>
                                </div>
                              </div>
                              
                              <div className="data-row">
                                <span className="label">PASSWORD</span>
                                <div className="value-box">
                                  <span className="value">aj6ry4y7c</span>
                                  <button 
                                    className={`copy-btn ${copiedField === `pass-${voucher.id}` ? 'copied' : ''}`}
                                    onClick={() => handleCopy('aj6ry4y7c', `pass-${voucher.id}`)}
                                  >
                                    {copiedField === `pass-${voucher.id}` ? 'DONE' : 'COPY'}
                                  </button>
                                </div>
                              </div>
                              
                              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', marginTop: '10px' }}>
                                Enjoy your Gift!
                              </p>
                            </>
                          ) : (
                            <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                              <p style={{ fontSize: '14px', marginBottom: '10px' }}>Click "CLAIM NOW" on the front to unlock your credentials</p>
                              <Gift className="w-12 h-12 mx-auto opacity-50" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
