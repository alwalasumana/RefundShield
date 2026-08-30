import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, ShoppingBag, CheckCircle2, AlertOctagon, Loader2, ArrowRight, X, CreditCard, Landmark, QrCode } from 'lucide-react';

const SANDBOX_PRODUCTS = [
  { productId: 'prod_00003', title: 'Apple MacBook Pro 16-inch M3 Max', price: 349900, desc: '36GB Unified Memory, 1TB SSD. Highly targeted by refund abuse rings.' },
  { productId: 'prod_00001', title: 'Apple iPhone 15 Pro Max 256GB', price: 159900, desc: 'Natural Titanium edition. High liquidity item frequently targeted.' },
  { productId: 'prod_00002', title: 'Sony WH-1000XM5 Wireless Headphones', price: 29990, desc: 'Industry-leading noise cancelling wireless headphones.' }
];

export default function Sandbox() {
  const [customers, setCustomers] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(SANDBOX_PRODUCTS[0]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
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

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingCustomers(true);
        setLoadingProducts(true);
        
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
          setSelectedCustomerId(sortedCustomers[0].customerId);
          setSelectedCustomer(sortedCustomers[0]);
        }
      } catch (err) {
        console.error('Error loading sandbox simulation data:', err);
      } finally {
        setLoadingCustomers(false);
        setLoadingProducts(false);
      }
    }
    loadData();
  }, []);

  const handleCustomerChange = (custId) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.customerId === custId);
    setSelectedCustomer(found || null);
  };

  const handleStartCheckout = () => {
    if (!selectedCustomer || !selectedProduct) return;
    
    // Lock the checkout state to the currently selected customer & product
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

      // Simulated payment verification time
      setTimeout(() => {
        setCheckoutResult(res.data);
        setCheckingOut(false);
      }, 2000);
    } catch (err) {
      setCheckoutResult({
        success: false,
        status: 'ERROR',
        message: err.response?.data?.message || 'Gateway connection timeout.'
      });
      setCheckingOut(false);
    }
  };

  return (
    <div className={`space-y-6 pb-12 transition-all duration-300 ${showCheckout ? 'pointer-events-none opacity-55' : ''}`}>
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-500" />
          <span>Razorpay Risk-Adaptive Checkout Simulator</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Close the loop. Test how the dashboard block decisions dynamically intercept and block payments at checkout in real-time using Razorpay style simulated payment overlays.
        </p>
      </div>

      {/* Simulator Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Config and Selections */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Select simulated customer */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">1</span>
              <h2 className="text-sm font-bold text-slate-200">Select Simulated Customer Profile</h2>
            </div>

            {loadingCustomers ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span>Loading customer registry...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Customer Under Test</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.name} ({c.customerId}) - {c.status} [Risk: {c.riskScore}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950 border border-slate-850 rounded-xl">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-mono">CUSTOMER NAME</span>
                      <span className="text-xs font-bold text-slate-200">{selectedCustomer.name}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-mono">RISK ASSESSMENT</span>
                      <span className={`text-xs font-bold font-mono ${
                        selectedCustomer.riskScore >= 75 ? 'text-red-400' :
                        selectedCustomer.riskScore >= 45 ? 'text-amber-400' : 'text-green-400'
                      }`}>
                        {selectedCustomer.riskLevel} ({selectedCustomer.riskScore})
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-mono">DATABASE STATUS</span>
                      <span className={`text-xs font-mono font-bold uppercase ${
                        selectedCustomer.status === 'SUSPENDED' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {selectedCustomer.status}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 font-mono">EXPECTED OUTCOME</span>
                      <span className={`text-xs font-bold ${
                        selectedCustomer.status === 'SUSPENDED' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {selectedCustomer.status === 'SUSPENDED' ? 'Payment Declined' : 'Payment Success'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Select Sandbox Product */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">2</span>
              <h2 className="text-sm font-bold text-slate-200">Select Sandbox Product to Purchase</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SANDBOX_PRODUCTS.map((prod) => (
                <div
                  key={prod.productId}
                  onClick={() => setSelectedProduct(prod)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    selectedProduct.productId === prod.productId
                      ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/30'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                  }`}
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{prod.title}</h3>
                    <p className="text-[10px] text-slate-400 mt-1">{prod.desc}</p>
                  </div>
                  <div className="text-sm font-extrabold text-blue-400 mt-3">
                    ₹{prod.price.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {loadingProducts ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Loading merchant product database...</span>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-800/60 space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Or Browse Full Catalog (500+ Items)</label>
                <select
                  value={SANDBOX_PRODUCTS.some(p => p.productId === selectedProduct.productId) ? '' : selectedProduct.productId}
                  onChange={(e) => {
                    const found = catalogProducts.find(p => p.productId === e.target.value);
                    if (found) setSelectedProduct(found);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="" disabled>-- Select a product from the database catalog --</option>
                  {catalogProducts.map((p) => (
                    <option key={p.productId} value={p.productId}>
                      [{p.category}] {p.title} - ₹{p.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Product Checkout Summary Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl sticky top-24">
            <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">Cart Summary</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-semibold text-slate-300">{selectedProduct.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Quantity: 1</div>
                </div>
                <div className="font-bold text-slate-200">₹{selectedProduct.price.toLocaleString()}</div>
              </div>

              <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Total Bill</span>
                <span className="text-base font-extrabold text-blue-400">₹{selectedProduct.price.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleStartCheckout}
              disabled={!selectedCustomerId}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/10 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RAZORPAY MOCK CHECKOUT OVERLAY MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 pointer-events-auto">
          <div className="w-full max-w-[380px] bg-[#0c101d] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header: Razorpay Styled Header */}
            <div className="bg-[#1263df] p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10 text-white border border-white/20">
                  <Shield className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-wide">RefundShield checkout</h4>
                  <p className="text-[8px] text-blue-100 font-mono">Merchant Sandbox Integration</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-blue-200 uppercase font-mono tracking-wider">Amount</div>
                <div className="text-sm font-black font-mono">₹{checkoutProduct?.price.toLocaleString()}</div>
              </div>
            </div>

            {/* Sub-Header Customer Context Banner */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-[9px] font-mono text-slate-400">
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
                    <p className="text-xs font-bold text-slate-200">Processing payment secure request...</p>
                    <p className="text-[9px] text-slate-400 font-mono">RefundShield executing real-time cluster check</p>
                  </div>
                </div>
              ) : checkoutResult ? (
                /* 2. SUCCESS/DECLINE SHIELD OUTCOME SCREEN */
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-auto text-center">
                  {checkoutResult.status === 'APPROVED' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/5">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-green-400">Payment Successful!</h4>
                        <p className="text-[9px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-850 inline-block">Order ID: {checkoutResult.orderId}</p>
                        <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-2">
                          RefundShield Risk Engine cleared transaction. Simulated order document created in MongoDB database.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/5">
                        <AlertOctagon className="w-7 h-7" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-bold text-red-400">Transaction Declined</h4>
                        <p className="text-[9px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-850 inline-block">Reason: SUSPENDED CUSTOMER PROFILE</p>
                        <p className="text-[10px] text-slate-300 max-w-xs mx-auto leading-relaxed mt-2">
                          Declined by RefundShield Gateway. Transaction rejected because the device fingerprint is flagged for serial coordinated return abuse.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : paymentMethod === 'card' ? (
                /* 3. CREDIT CARD FORM INPUT SCREEN */
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Credit Card Details</div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full bg-[#13192e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full bg-[#13192e] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-500 uppercase font-mono mb-1">CVV</label>
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
                        <span className="text-xs text-slate-300 font-medium group-hover:text-slate-100">Credit / Debit Card</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                    </div>

                    <div
                      onClick={() => setPaymentMethod('upi')}
                      className="p-3 bg-[#13192e] border border-slate-800 hover:border-blue-500/40 rounded-xl cursor-pointer flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-slate-300 font-medium group-hover:text-slate-100">UPI / GooglePay</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                    </div>

                    <div
                      onClick={handleProcessPayment}
                      className="p-3 bg-[#13192e] border border-slate-800 hover:border-blue-500/40 rounded-xl cursor-pointer flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-3">
                        <Landmark className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-slate-300 font-medium group-hover:text-slate-100">Netbanking</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button / Bottom Area */}
              <div className="border-t border-slate-900 pt-4 mt-6 flex justify-between items-center text-[10px]">
                <span className="text-slate-500">RefundShield v2.0</span>
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
