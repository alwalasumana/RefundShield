import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Shield, ShoppingBag, CheckCircle2, AlertOctagon, Loader2, ArrowRight, 
  X, CreditCard, Landmark, QrCode, Smartphone, Laptop, 
  Headphones, User, HelpCircle, MonitorPlay, Check
} from 'lucide-react';

const SANDBOX_PRODUCTS = [
  { 
    productId: 'prod_00003', 
    title: 'Apple MacBook Pro 16" (M3 Max)', 
    price: 349900, 
    desc: '36GB Unified Memory, 1TB SSD. Highly targeted by coordinated refund abuse rings.',
    image: 'Laptop'
  },
  { 
    productId: 'prod_00001', 
    title: 'Apple iPhone 15 Pro Max 256GB', 
    price: 159900, 
    desc: 'Natural Titanium edition. High liquidity item frequently targeted for empty-box claims.',
    image: 'Smartphone'
  },
  { 
    productId: 'prod_00002', 
    title: 'Sony WH-1000XM5 Wireless ANC', 
    price: 29990, 
    desc: 'Industry-leading noise cancelling wireless headphones. Popular target for serial returns.',
    image: 'Headphones'
  }
];

export default function Sandbox() {
  const [customers, setCustomers] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(SANDBOX_PRODUCTS[0]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  
  // Checkout Modal States
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutCustomer, setCheckoutCustomer] = useState(null);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(''); // 'card' | 'upi' | 'netbanking' | ''
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);

  // Card Form States
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/29');
  const [cardCvv, setCardCvv] = useState('123');

  const loadData = async () => {
    try {
      setLoadingCustomers(true);
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers?limit=150'),
        api.get('/products')
      ]);

      const sortedCustomers = (custRes.data.customers || []).sort((a, b) => {
        if (a.status === 'SUSPENDED' && b.status !== 'SUSPENDED') return -1;
        if (a.status !== 'SUSPENDED' && b.status === 'SUSPENDED') return 1;
        return b.riskScore - a.riskScore;
      });

      setCustomers(sortedCustomers);
      setCatalogProducts(prodRes.data || []);
      
      if (sortedCustomers.length > 0) {
        // Default to legitimate-ish first customer
        const defaultCust = sortedCustomers.find(c => c.status !== 'SUSPENDED') || sortedCustomers[0];
        setSelectedCustomerId(defaultCust.customerId);
        setSelectedCustomer(defaultCust);
      }
    } catch (err) {
      console.error('Error loading sandbox simulation data:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerChange = (custId) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.customerId === custId);
    setSelectedCustomer(found || null);
  };

  const selectScenario = (type) => {
    if (customers.length === 0) return;
    
    let target = null;
    if (type === 'legit') {
      target = customers.find(c => c.status !== 'SUSPENDED' && c.riskScore < 20) || customers[customers.length - 1];
    } else if (type === 'suspicious') {
      target = customers.find(c => c.status !== 'SUSPENDED' && c.riskScore >= 45 && c.riskScore < 80) || customers[0];
    } else if (type === 'fraud') {
      target = customers.find(c => c.status === 'SUSPENDED') || customers[0];
    }

    if (target) {
      setSelectedCustomerId(target.customerId);
      setSelectedCustomer(target);
    }
  };

  const handleStartCheckout = () => {
    if (!selectedCustomer || !selectedProduct) return;
    
    setCheckoutCustomer(selectedCustomer);
    setCheckoutProduct(selectedProduct);
    setPaymentMethod('');
    setCheckoutResult(null);
    setShowCheckout(true);
  };

  const handleProcessPayment = async () => {
    setCheckingOut(true);

    try {
      const res = await api.post('/sandbox/checkout', {
        customerId: checkoutCustomer.customerId,
        amount: checkoutProduct.price,
        itemTitle: checkoutProduct.title
      });

      // Simulated payment delay to match gate latency experience
      setTimeout(() => {
        setCheckoutResult(res.data);
        setCheckingOut(false);
      }, 1200);
    } catch (err) {
      setTimeout(() => {
        setCheckoutResult({
          success: false,
          status: 'BLOCKED',
          message: 'Network security timeout or active block during transaction verification.'
        });
        setCheckingOut(false);
      }, 1200);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. FLOATING DEVELOPER DEMO BAR */}
      <div className="bg-slate-900 border border-blue-500/20 p-4 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg">
            <MonitorPlay className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Developer Demo Control Center</h2>
            <p className="text-[10px] text-slate-400">Select which customer profile to simulate checkout requests as.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Quick preset switches */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
            <button 
              onClick={() => selectScenario('legit')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedCustomer && selectedCustomer.status !== 'SUSPENDED' && selectedCustomer.riskScore < 20
                  ? 'bg-green-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Legitimate
            </button>
            <button 
              onClick={() => selectScenario('suspicious')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedCustomer && selectedCustomer.status !== 'SUSPENDED' && selectedCustomer.riskScore >= 45 && selectedCustomer.riskScore < 80
                  ? 'bg-orange-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Frequent Returner
            </button>
            <button 
              onClick={() => selectScenario('fraud')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedCustomer && selectedCustomer.status === 'SUSPENDED'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Suspended/Ring
            </button>
          </div>

          {loadingCustomers ? (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Syncing DB...</span>
            </div>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10.5px] font-mono text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[200px]"
            >
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.name} (Risk: {c.riskScore}%)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 2. RETAIL STORE FRONT AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left E-commerce Shelf */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
            
            {/* Visual Store Header banner */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                <h1 className="text-base font-extrabold text-slate-100">Retail Electronics Storefront</h1>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Select a product from the shelf below to add it to your cart, then proceed to payment checkout on the right.
              </p>
            </div>

            {/* Product shelf grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SANDBOX_PRODUCTS.map((prod) => {
                const isSelected = selectedProduct?.productId === prod.productId;
                return (
                  <div
                    key={prod.productId}
                    onClick={() => setSelectedProduct(prod)}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between group h-[250px] cursor-pointer ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30 shadow-md' 
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Product icon category */}
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 rounded-xl transition-colors ${
                          isSelected ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-900 text-slate-400'
                        }`}>
                          {prod.image === 'Laptop' ? (
                            <Laptop className="w-5 h-5" />
                          ) : prod.image === 'Smartphone' ? (
                            <Smartphone className="w-5 h-5" />
                          ) : (
                            <Headphones className="w-5 h-5" />
                          )}
                        </div>
                        {isSelected ? (
                          <span className="p-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500">In Stock</span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-200">{prod.title}</h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{prod.desc}</p>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-900/60 flex justify-between items-center">
                      <span className="text-xs font-mono text-slate-400">Price</span>
                      <span className="text-xs font-extrabold text-blue-400 font-mono">
                        ₹{prod.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Active Context + Cart Summary & Proceed to Checkout */}
        <div className="space-y-6">
          
          {/* Active Sim Context Profile Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">Active Customer Profile</h3>
            
            {selectedCustomer ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-855">
                  <span className="text-slate-500 text-[10px]">CUSTOMER</span>
                  <span className="text-slate-200 font-bold font-sans flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    {selectedCustomer.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-855">
                    <span className="text-slate-500 block">RISK LEVEL</span>
                    <span className={`font-bold mt-0.5 block ${
                      selectedCustomer.riskScore >= 80 ? 'text-red-500' : selectedCustomer.riskScore >= 50 ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                      {selectedCustomer.riskLevel} ({selectedCustomer.riskScore}%)
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-855">
                    <span className="text-slate-500 block">DB STATUS</span>
                    <span className={`font-bold mt-0.5 block ${selectedCustomer.status === 'SUSPENDED' ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2 text-center">No active customer profile context loaded.</div>
            )}
          </div>

          {/* Cart Summary & Proceed to Checkout Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2">Cart Summary</h3>

            {selectedProduct ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{selectedProduct.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Quantity: 1</div>
                  </div>
                  <div className="font-bold text-slate-200 font-mono">₹{selectedProduct.price.toLocaleString()}</div>
                </div>

                <div className="border-t border-slate-850 pt-4 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Grand Total</span>
                  <span className="text-sm font-extrabold text-blue-400 font-mono">₹{selectedProduct.price.toLocaleString()}</span>
                </div>

                <button
                  onClick={handleStartCheckout}
                  disabled={!selectedCustomerId || !selectedProduct}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 flex items-center justify-center gap-1.5 transition disabled:opacity-50 mt-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic text-center py-4">Please select a product from the shelf.</div>
            )}
          </div>

        </div>
      </div>

      {/* RAZORPAY MOCK CHECKOUT OVERLAY MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-[400px] bg-[#0c101d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header: Razorpay Styled Header */}
            <div className="bg-[#1263df] p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide">RefundShield Checkout</h4>
                  <p className="text-[8px] text-blue-100 font-mono">Merchant Sandbox Integration</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-blue-200 uppercase font-mono tracking-wider">Amount</div>
                <div className="text-sm font-black font-mono">₹{checkoutProduct?.price.toLocaleString()}</div>
              </div>
            </div>

            {/* Sub-Header Customer Context Banner */}
            <div className="bg-slate-950 border-b border-slate-855 px-4 py-2.5 flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>Customer: {checkoutCustomer?.name}</span>
              <span className={checkoutCustomer?.status === 'SUSPENDED' ? 'text-red-400 font-bold' : 'text-green-400'}>
                {checkoutCustomer?.status}
              </span>
            </div>

            {/* Content Body */}
            <div className="p-5 flex-1 flex flex-col justify-between min-h-[300px]">
              
              {checkingOut ? (
                /* 1. CHECKING OUT SPINNER SCREEN */
                <div className="flex-1 flex flex-col items-center justify-center space-y-4 my-auto">
                  <Loader2 className="w-9 h-9 animate-spin text-blue-500" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-200 animate-pulse">Processing payment secure request...</p>
                    <p className="text-[9px] text-slate-400 font-mono">RefundShield executing real-time cluster check</p>
                  </div>
                </div>
              ) : checkoutResult ? (
                /* 2. SUCCESS/DECLINE SHIELD OUTCOME SCREEN */
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center my-auto">
                    {checkoutResult.success ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/5">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-green-400">Payment Approved!</h4>
                          <p className="text-[9px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 inline-block">Order ID: {checkoutResult.orderId}</p>
                          <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-2">
                            {checkoutResult.status === 'REVIEW' 
                              ? 'Cleared pre-payment verification, but flagged for post-payment AI agent audit.'
                              : 'RefundShield Risk Engine cleared transaction. Simulated order document created in MongoDB database.'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/5">
                          <AlertOctagon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-red-400">Transaction Declined</h4>
                          <p className="text-[9px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 inline-block">Reason: REFUNDSHIELD SECURITY INTERCEPT</p>
                          <p className="text-[10px] text-slate-300 max-w-xs mx-auto leading-relaxed mt-2">
                            {checkoutResult.message}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : paymentMethod === 'card' ? (
                /* 3. CREDIT CARD FORM INPUT SCREEN (WITH VIRTUAL CREDIT CARD GRAPHIC) */
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Virtual credit card design */}
                    <div className="relative h-36 bg-gradient-to-br from-blue-700 via-indigo-600 to-indigo-800 rounded-xl p-4 shadow-2xl text-white font-mono flex flex-col justify-between overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-6 -mt-6 pointer-events-none" />
                      <div className="flex justify-between items-center">
                        <div className="w-9 h-6 bg-amber-400/20 border border-amber-400/30 rounded flex items-center justify-center text-[7px] text-amber-300">CHIP</div>
                        <span className="text-[9px] font-black italic tracking-wider text-slate-200 font-sans">REFUNDSHIELD CARD</span>
                      </div>
                      <div className="text-sm tracking-widest my-2 text-center text-slate-100 font-semibold">{cardNumber || '•••• •••• •••• ••••'}</div>
                      <div className="flex justify-between items-center text-[9px]">
                        <div>
                          <div className="text-[6px] uppercase text-indigo-200">Card Holder</div>
                          <div className="truncate w-28 text-[9px] font-bold">{checkoutCustomer?.name || 'GUEST USER'}</div>
                        </div>
                        <div className="flex gap-3">
                          <div>
                            <div className="text-[6px] uppercase text-indigo-200">Expires</div>
                            <div className="text-[9px] font-bold">{cardExpiry || 'MM/YY'}</div>
                          </div>
                          <div>
                            <div className="text-[6px] uppercase text-indigo-200">CVV</div>
                            <div className="text-[9px] font-bold">{cardCvv || 'CVV'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[8px] text-slate-500 uppercase font-mono mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-[#13192e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono mb-1">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full bg-[#13192e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] text-slate-500 uppercase font-mono mb-1">CVV</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full bg-[#13192e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleProcessPayment}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                  >
                    Pay ₹{checkoutProduct?.price.toLocaleString()} Securely
                  </button>
                </div>
              ) : paymentMethod === 'upi' ? (
                /* 4. UPI INPUT SCREEN */
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">UPI / GPay Transaction</div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Virtual Payment Address (VPA)</label>
                      <input
                        type="text"
                        defaultValue={`${checkoutCustomer?.name.toLowerCase().replace(/\s/g, '')}@okaxis`}
                        className="w-full bg-[#13192e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                        readOnly
                      />
                    </div>
                    {/* Simulated QR Code Scan */}
                    <div className="flex justify-center py-4 bg-slate-950/60 rounded-xl border border-slate-855">
                      <div className="p-2.5 bg-white rounded-lg">
                        <QrCode className="w-24 h-24 text-slate-900" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleProcessPayment}
                    className="w-full py-2.5 bg-[#1263df] hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                  >
                    Send UPI Request
                  </button>
                </div>
              ) : (
                /* 5. METHOD SELECTOR OVERVIEW (DEFAULT INITIAL SCREEN) */
                <div className="space-y-4">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Select Payment Method</div>
                  
                  <div className="space-y-2">
                    <div
                      onClick={() => setPaymentMethod('card')}
                      className="p-3 bg-[#13192e] border border-slate-800 hover:border-blue-500/40 rounded-xl cursor-pointer flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-slate-300 font-medium group-hover:text-slate-100 font-sans">Credit / Debit Card</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-650 group-hover:text-slate-400 transition" />
                    </div>

                    <div
                      onClick={() => setPaymentMethod('upi')}
                      className="p-3 bg-[#13192e] border border-slate-800 hover:border-blue-500/40 rounded-xl cursor-pointer flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-slate-300 font-medium group-hover:text-slate-100 font-sans">UPI / GooglePay</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-650 group-hover:text-slate-400 transition" />
                    </div>

                    <div
                      onClick={handleProcessPayment}
                      className="p-3 bg-[#13192e] border border-slate-800 hover:border-blue-500/40 rounded-xl cursor-pointer flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <Landmark className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-slate-300 font-medium group-hover:text-slate-100 font-sans">Netbanking</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-650 group-hover:text-slate-400 transition" />
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button / Bottom Area */}
              <div className="border-t border-slate-900/60 pt-4 mt-6 flex justify-between items-center text-[10px]">
                <span className="text-slate-500 font-mono">RefundShield v2.0</span>
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    setCheckoutResult(null);
                    setPaymentMethod('');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold transition flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
