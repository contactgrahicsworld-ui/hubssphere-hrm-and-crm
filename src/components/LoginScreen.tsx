import React, { useState, useEffect, useRef } from 'react';
import { Shield, Phone, Loader2, Key, HelpCircle, Mail, User, MapPin, Compass, Laptop, Smartphone, AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { 
    id: string; 
    name: string; 
    email: string; 
    phone?: string;
    role: 'admin' | 'sub-admin' | 'head' | 'staff' | 'telecaller';
    department?: 'Tech' | 'NonTech' | 'Sales';
    position?: string;
    pcLoginAuthorizedAt?: string; // Optional timestamp when authorized via mobile GPS
  }) => void;
}

// Office GPS Coordinates from google maps link provided by user
const OFFICE_LAT = 21.2078048;
const OFFICE_LON = 81.3540014;

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'staff_signin' | 'admin_signin' | 'recovery'>('staff_signin');
  const [recoveryType, setRecoveryType] = useState<'staff' | 'main_admin'>('staff');
  
  // Fields
  const [companyName, setCompanyName] = useState('HubSphere');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Only used for main admin recovery
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // GPS / Device Location States
  const [deviceType, setDeviceType] = useState<'mobile' | 'pc'>('mobile');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [isLocationMatched, setIsLocationMatched] = useState(false);
  
  // PC Login Timing States
  const [pcMobileAuthorized, setPcMobileAuthorized] = useState(false);
  const [pcAuthTimestamp, setPcAuthTimestamp] = useState<string | null>(null);
  const [pcSecondsLeft, setPcSecondsLeft] = useState(0); // 18 minutes countdown = 1080 seconds
  const countdownIntervalRef = useRef<any>(null);

  // Clean interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Countdown timer for PC Login
  useEffect(() => {
    if (pcSecondsLeft > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setPcSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [pcSecondsLeft]);

  // Distance helper (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // meters
  };

  // Perform GPS Location Check
  const verifyLocationGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    setGpsDistance(null);

    if (!navigator.geolocation) {
      setGpsError('Browser does not support Geolocation (ब्राउज़र जियोलोकेशन का समर्थन नहीं करता है)');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = calculateDistance(latitude, longitude, OFFICE_LAT, OFFICE_LON);
        setGpsDistance(Math.round(dist));

        // Let's allow within 150 meters as matched
        if (dist <= 150) {
          if (deviceType === 'mobile') {
            setIsLocationMatched(true);
            setSuccess('✅ Geolocation matched! Mobile device authorized for Login (मोबाइल डिवाइस अधिकृत है।)');
          } else {
            // PC path
            setPcMobileAuthorized(true);
            const authTime = new Date().toISOString();
            setPcAuthTimestamp(authTime);
            setPcSecondsLeft(18 * 60); // 18 minutes wait
            setSuccess('✅ Geolocation matched! Mobile verification saved. Starting 18-minute PC Login countdown (18 मिनट का काउंटडाउन शुरू)।');
          }
        } else {
          setGpsError(`You are ${Math.round(dist)} meters away from the office coordinates. Must be within 150 meters. (आप ऑफिस से ${Math.round(dist)} मीटर दूर हैं। लॉग इन करने के लिए ऑफिस के दायरे में होना आवश्यक है।)`);
        }
        setGpsLoading(false);
      },
      (error) => {
        let msg = 'Error fetching location (लोकेशन प्राप्त करने में त्रुटि)';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Geolocation access denied. Please grant permission or use the Simulating option. (लोकेशन अनुमति अस्वीकार कर दी गई है। कृपया सिम्युलेटर विकल्प का उपयोग करें।)';
        }
        setGpsError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Simulate/Force Location match for Testing/Iframes
  const simulateLocationMatch = () => {
    setGpsError('');
    setGpsDistance(0);
    
    if (deviceType === 'mobile') {
      setIsLocationMatched(true);
      setSuccess('✅ Location Matched via Simulator! Mobile device is now authorized (लॉगिन स्वीकृत है)।');
    } else {
      setPcMobileAuthorized(true);
      const authTime = new Date().toISOString();
      setPcAuthTimestamp(authTime);
      setPcSecondsLeft(18 * 60); // 18 minutes
      setSuccess('✅ Mobile verification simulated successfully! Starting 18-minute PC Login countdown.');
    }
  };

  // Fast-Forward the PC wait timer (testing tool)
  const fastForwardPcTimer = () => {
    setPcSecondsLeft(0);
    setSuccess('✅ Wait period skipped! You can now log in securely via PC (पीसी से लॉग इन करें)।');
  };

  // Recoveries submissions
  const handleStaffRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('कृपया अपना पंजीकृत यूजरनेम दर्ज करें (Please enter your registered username).');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/request-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(data.message || 'अनुरोध सफलतापूर्वक भेज दिया गया है!');
    } catch (err: any) {
      setError(err.message || 'रिकवरी अनुरोध भेजने में त्रुटि हुई।');
    } finally {
      setLoading(false);
    }
  };

  const handleMainAdminRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setError('नाम और पंजीकृत ईमेल दोनों दर्ज करें (Please enter both your name and registered email).');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/main-admin-recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      setSuccess(data.message || 'पासवर्ड आपके व्हाट्सएप और ईमेल पर भेज दिया गया है!');
    } catch (err: any) {
      setError(err.message || 'मुख्य एडमिन रिकवरी में त्रुटि हुई।');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // If recovery, run recovery instead
    if (activeTab === 'recovery') {
      if (recoveryType === 'staff') {
        return handleStaffRecoverySubmit(e);
      } else {
        return handleMainAdminRecoverySubmit(e);
      }
    }

    // 1. Verify Location Requirement (Main Admin u-admin is exempted from GPS checks as per rules)
    const isMainAdminLogging = activeTab === 'admin_signin';
    if (!isMainAdminLogging) {
      if (deviceType === 'mobile' && !isLocationMatched) {
        setError('मिसमैच: लॉग इन केवल ऑफिस लोकेशन (GPS) पर ही संभव है (Error: Login is only allowed at the registered office coordinates).');
        return;
      }
      if (deviceType === 'pc') {
        if (!pcMobileAuthorized) {
          setError('त्रुटि: पहले मोबाइल GPS से अपनी उपस्थिति अधिकृत करें (Error: You must first verify location via Mobile GPS).');
          return;
        }
        if (pcSecondsLeft > 0) {
          setError(`पीसी लॉग इन प्रतिबंध: कृपया काउंटडाउन समाप्त होने तक प्रतीक्षा करें या टेस्ट स्किप बटन दबाएं (${Math.floor(pcSecondsLeft / 60)}m ${pcSecondsLeft % 60}s remaining).`);
          return;
        }
      }
    }

    if (!name || !password) {
      setError('Name and password are required');
      return;
    }

    if (activeTab === 'staff_signin' && !companyName) {
      setError('Company name is required for staff members');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Check role permissions based on signin tab
      const loggedUser = data.user;
      if (activeTab === 'admin_signin' && loggedUser.role !== 'admin') {
        throw new Error('This tab is reserved exclusively for the Main Admin.');
      }
      if (activeTab === 'staff_signin' && loggedUser.role === 'admin') {
        throw new Error('Main Admin must use the "Main Admin" tab to log in.');
      }

      // If PC login is used, inject the active login timestamp (which counts from the mobile verification time, 18 minutes earlier)
      if (deviceType === 'pc' && pcAuthTimestamp) {
        loggedUser.pcLoginAuthorizedAt = pcAuthTimestamp;
      }

      onLoginSuccess(loggedUser);
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'staff_signin' | 'admin_signin') => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
    // Clear GPS states on tab change
    setIsLocationMatched(false);
    setPcMobileAuthorized(false);
    setPcSecondsLeft(0);
    setGpsError('');
    setGpsDistance(null);
  };

  return (
    <div className="min-h-screen bg-[#090b11] text-gray-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-orange-500 selection:text-white">
      {/* Brand Logo & Header */}
      <div className="flex flex-col items-center mb-6 text-center bg-white px-8 py-5 rounded-3xl shadow-xl border border-gray-100 max-w-sm w-full">
        <div className="flex items-center gap-3 bg-gradient-to-br from-orange-500 to-amber-500 p-3.5 rounded-2xl shadow-lg shadow-orange-500/20 mb-3">
          <Shield className="w-7 h-7 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-0">
          <span className="text-[#f97316]">Hub</span>
          <span className="text-black">Sphere</span>
        </h1>
        <p className="text-[10px] font-black text-gray-400 uppercase mt-1.5 tracking-widest">
          Integrated ERP Environment
        </p>
      </div>

      {/* Main Login Panel */}
      <div className="w-full max-w-md bg-[#131924] border border-[#1e2635] rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>

        {/* Form Selection Tabs */}
        {activeTab !== 'recovery' ? (
          <div className="flex border-b border-[#1f2635] mb-6">
            <button
              id="tab-staff-btn"
              type="button"
              onClick={() => handleTabChange('staff_signin')}
              className={`flex-1 pb-3 text-center font-bold text-xs tracking-wide transition-all duration-200 border-b-2 ${
                activeTab === 'staff_signin'
                  ? 'border-[#f97316] text-[#f97316]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In <span className="block text-[9px] font-medium opacity-80">(Sub Admin, Head, Staff)</span>
            </button>
            <button
              id="tab-admin-btn"
              type="button"
              onClick={() => handleTabChange('admin_signin')}
              className={`flex-1 pb-3 text-center font-bold text-xs tracking-wide transition-all duration-200 border-b-2 ${
                activeTab === 'admin_signin'
                  ? 'border-[#f97316] text-[#f97316]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In <span className="block text-[9px] font-medium opacity-80">(Main Admin)</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-[#1f2635] pb-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('staff_signin');
                setError('');
                setSuccess('');
              }}
              className="text-xs font-bold text-[#f97316] hover:underline"
            >
              ← Back to Sign In (लॉग इन पर जाएं)
            </button>
            <span className="text-gray-400 text-xs font-semibold ml-auto">
              Password Recovery (पासवर्ड पुनः प्राप्ति)
            </span>
          </div>
        )}

        {/* Display Error / Success Notifications */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3.5 mb-4 font-medium flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl p-3.5 mb-4 font-medium whitespace-pre-line">
            {success}
          </div>
        )}

        {/* GPS Verification Widget (Only shown for non-Main Admin, non-recovery screens) */}
        {activeTab !== 'recovery' && activeTab !== 'admin_signin' && (
          <div className="mb-6 p-4 rounded-xl bg-[#0d111a] border border-[#1d2433] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#1d2433] pb-2">
              <span className="text-xs font-bold text-[#f97316] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4.5 h-4.5" /> GPS Location Check
              </span>
              <span className="text-[9px] bg-orange-500/15 border border-orange-500/35 text-[#f97316] px-2 py-0.5 rounded-full font-bold uppercase">
                Required
              </span>
            </div>

            {/* Device Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-[#141a27] p-1 rounded-xl border border-[#20293b]">
              <button
                type="button"
                onClick={() => {
                  setDeviceType('mobile');
                  setIsLocationMatched(false);
                  setPcMobileAuthorized(false);
                  setPcSecondsLeft(0);
                  setGpsError('');
                  setGpsDistance(null);
                }}
                className={`py-1.5 rounded-lg text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                  deviceType === 'mobile'
                    ? 'bg-[#f97316] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile Device
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeviceType('pc');
                  setIsLocationMatched(false);
                  setPcMobileAuthorized(false);
                  setPcSecondsLeft(0);
                  setGpsError('');
                  setGpsDistance(null);
                }}
                className={`py-1.5 rounded-lg text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all ${
                  deviceType === 'pc'
                    ? 'bg-[#f97316] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" /> Desktop PC
              </button>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed">
              {deviceType === 'mobile'
                ? "लॉग इन केवल ऑफिस लोकेशन (GPS) पर संभव है। कृपया अपना लोकेशन सत्यापित करें।"
                : "पीसी से सीधे लॉग इन संभव नहीं है। पहले मोबाइल GPS से अपनी लोकेशन दर्ज करें, जिसके 18 मिनट बाद पीसी एक्टिवेट होगा।"}
            </p>

            {gpsError && (
              <div className="text-[10px] text-red-400 bg-red-950/20 border border-red-500/20 rounded-lg p-2 font-semibold">
                ⚠️ {gpsError}
              </div>
            )}

            {/* GPS Interaction Controls */}
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={gpsLoading}
                  onClick={verifyLocationGPS}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[10px] py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition"
                >
                  {gpsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Compass className="w-3.5 h-3.5 animate-pulse" />
                  )}
                  Verify GPS (लोकेशन जांचें)
                </button>

                <button
                  type="button"
                  onClick={simulateLocationMatch}
                  className="bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 font-bold text-[10px] py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition"
                >
                  Simulate GPS (लोकेशन मिलाएँ)
                </button>
              </div>

              {/* PC Countdown Panel */}
              {deviceType === 'pc' && pcMobileAuthorized && (
                <div className="bg-[#10141f] border border-blue-500/20 rounded-xl p-3 space-y-2.5 text-center">
                  <div className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Loader2 className="w-4.5 h-4.5 animate-spin text-[#f97316]" />
                    <span>PC TIMING SECURITY ACTIVATED</span>
                  </div>
                  
                  {pcSecondsLeft > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-gray-300">
                        Please wait 18 minutes for PC security clearance:
                      </p>
                      <p className="text-xl font-black font-mono text-white tracking-widest">
                        {Math.floor(pcSecondsLeft / 60).toString().padStart(2, '0')}:
                        {(pcSecondsLeft % 60).toString().padStart(2, '0')}
                      </p>
                      <button
                        type="button"
                        onClick={fastForwardPcTimer}
                        className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-black text-[9px] py-1.5 rounded-lg transition uppercase tracking-wider"
                      >
                        ⚡ Fast-Forward 18 min for Testing
                      </button>
                    </div>
                  ) : (
                    <div className="p-1 text-center">
                      <span className="text-xs font-bold text-emerald-400">
                        ✅ 18-Minute wait clearance verified! PC login unlocked.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Authentication Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recovery Type Toggle (Only shown in recovery tab) */}
          {activeTab === 'recovery' && (
            <div className="bg-[#1a202c] p-1.5 rounded-xl border border-[#2d3748] flex gap-1 mb-4">
              <button
                type="button"
                onClick={() => {
                  setRecoveryType('staff');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 text-center py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  recoveryType === 'staff'
                    ? 'bg-[#f97316] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👤 Staff Recovery (स्टाफ सदस्य)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecoveryType('main_admin');
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 text-center py-2 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                  recoveryType === 'main_admin'
                    ? 'bg-[#f97316] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👑 Main Admin Recovery (मुख्य एडमिन)
              </button>
            </div>
          )}

          {/* Company Name (only shown for staff sign-in) */}
          {activeTab === 'staff_signin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Company Name (कंपनी का नाम) *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. HubSphere"
                className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
              />
            </div>
          )}

          {/* Name Field */}
          {(activeTab === 'staff_signin' || activeTab === 'admin_signin' || activeTab === 'recovery') && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-gray-500" />
                {activeTab === 'recovery' && recoveryType === 'main_admin' 
                  ? 'Main Admin Name (मुख्य एडमिन का नाम)' 
                  : 'Your Name / Username (आपका नाम / यूजरनेम) *'}
              </label>
              <input
                id="name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Suresh Gupta"
                className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
              />
            </div>
          )}

          {/* Email Field (Only shown in main admin recovery mode) */}
          {activeTab === 'recovery' && recoveryType === 'main_admin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                Email Address (पंजीकृत ईमेल पता) *
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@company.com"
                className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
              />
            </div>
          )}

          {/* Password Field (shown in standard signin tabs) */}
          {activeTab !== 'recovery' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Password (पासवर्ड) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recovery');
                    setRecoveryType(activeTab === 'admin_signin' ? 'main_admin' : 'staff');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-[#f97316] hover:underline font-medium cursor-pointer"
                >
                  Forgot password? (पासवर्ड भूल गए?)
                </button>
              </div>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0e121a] border border-[#222b3c] focus:border-[#f97316] rounded-xl px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-600 transition-all duration-250"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-[#f97316] hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/25 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 text-xs cursor-pointer uppercase tracking-wider"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : activeTab === 'staff_signin' ? (
              'Sign In to Workspace'
            ) : activeTab === 'admin_signin' ? (
              'Log In as Main Admin'
            ) : recoveryType === 'staff' ? (
              'Send Request to Main Admin'
            ) : (
              'Send Password to WhatsApp'
            )}
          </button>
        </form>

        {/* Informative Tip */}
        <div className="mt-6 pt-4 border-t border-[#1f2635] text-center">
          <p className="text-[10px] text-gray-500">
            {activeTab === 'staff_signin' 
              ? 'Sign In tab for Sub-Admin, Department Heads, and General Staff. Location authorization required.' 
              : activeTab === 'admin_signin'
                ? 'Main Admin login panel. Exempted from company GPS location and timing restrictions.'
                : recoveryType === 'staff'
                  ? 'पासवर्ड भूल जाने पर अपना नाम डालकर मुख्य एडमिन को रिकवरी रिक्वेस्ट भेजें।'
                  : 'मुख्य एडमिन पासवर्ड भूल जाने पर व्हाट्सएप और पंजीकृत ईमेल पर तुरंत पासवर्ड पुनः प्राप्त कर सकते हैं।'}
          </p>
        </div>
      </div>
    </div>
  );
}
