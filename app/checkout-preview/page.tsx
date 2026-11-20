import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Secure Checkout — Playroom Toys",
  description: "Playroom Toys uses Stripe for all payment processing. Card details are collected directly by Stripe's PCI DSS Level 1 certified infrastructure and never stored on Playroom servers.",
  robots: "noindex",
};

export default function CheckoutPreview() {
  return (
    <div style={{minHeight:"100vh",background:"#f6f8fa",display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 16px",fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:"100%",maxWidth:"400px"}}>
        <div style={{textAlign:"center",marginBottom:"28px"}}>
          <div style={{fontSize:"13px",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",color:"#636e72",marginBottom:"8px"}}>Playroom Toys · Secure Checkout</div>
          <div style={{fontSize:"12px",color:"#8a9bab",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"}}>
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><path d="M6 1L1.5 3v4c0 2.76 1.95 5.34 4.5 6 2.55-.66 4.5-3.24 4.5-6V3L6 1z" fill="#2ecc71" fillOpacity=".2" stroke="#2ecc71" strokeWidth="1.2"/></svg>
            256-bit TLS · Stripe PCI DSS Level 1
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:"10px",boxShadow:"0 2px 12px rgba(0,0,0,.08)",overflow:"hidden",border:"1px solid #e1e8ed"}}>
          <div style={{padding:"22px 24px 18px",borderBottom:"1px solid #f0f4f7"}}>
            <div style={{fontSize:"11px",fontWeight:600,color:"#8792a2",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"12px"}}>Order summary</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"14px",color:"#1a1f36"}}>
              <span>Rainbow Stacker × 1</span>
              <span style={{fontWeight:600}}>$29.00</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"13px",color:"#6b7c93",marginTop:"6px"}}>
              <span>Shipping</span>
              <span>$4.95</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"14px",fontWeight:700,color:"#1a1f36",marginTop:"12px",paddingTop:"12px",borderTop:"1px solid #f0f4f7"}}>
              <span>Total</span>
              <span>$33.95</span>
            </div>
          </div>

          <div style={{padding:"22px 24px"}}>
            <div style={{fontSize:"11px",fontWeight:600,color:"#8792a2",textTransform:"uppercase",letterSpacing:".05em",marginBottom:"14px"}}>Payment details</div>

            <div style={{border:"1px solid #e0e0e0",borderRadius:"5px",overflow:"hidden",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
              <div style={{borderBottom:"1px solid #e0e0e0"}}>
                <div style={{padding:"10px 14px 0",fontSize:"11px",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",color:"#8792a2"}}>Card number</div>
                <input type="text" placeholder="1234 1234 1234 1234" readOnly style={{border:"none",width:"100%",padding:"10px 14px 12px",fontSize:"15px",color:"#aab7c4",background:"transparent",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
                <div style={{borderRight:"1px solid #e0e0e0"}}>
                  <div style={{padding:"10px 14px 0",fontSize:"11px",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",color:"#8792a2"}}>Expiry</div>
                  <input type="text" placeholder="MM / YY" readOnly style={{border:"none",width:"100%",padding:"10px 14px 12px",fontSize:"15px",color:"#aab7c4",background:"transparent",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <div style={{padding:"10px 14px 0",fontSize:"11px",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",color:"#8792a2"}}>CVC</div>
                  <input type="text" placeholder="•••" readOnly style={{border:"none",width:"100%",padding:"10px 14px 12px",fontSize:"15px",color:"#aab7c4",background:"transparent",outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{borderTop:"1px solid #e0e0e0"}}>
                <div style={{padding:"10px 14px 0",fontSize:"11px",fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",color:"#8792a2"}}>Name on card</div>
                <input type="text" placeholder="Full name as it appears on card" readOnly style={{border:"none",width:"100%",padding:"10px 14px 12px",fontSize:"15px",color:"#aab7c4",background:"transparent",outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            <div style={{marginTop:"16px",padding:"11px 13px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:"6px",display:"flex",alignItems:"center",gap:"8px",fontSize:"11.5px",color:"#6b7280"}}>
              <svg width="13" height="16" viewBox="0 0 13 16" fill="none"><rect x="1" y="6" width="11" height="9" rx="2" fill="none" stroke="#635bff" strokeWidth="1.3"/><path d="M4 6V4.5a2.5 2.5 0 015 0V6" stroke="#635bff" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span>Your payment info is encrypted and securely handled by <strong style={{color:"#635bff",fontWeight:700}}>Stripe</strong></span>
            </div>

            <div style={{marginTop:"14px",display:"flex",alignItems:"center",justifyContent:"center",gap:"5px",fontSize:"11px",color:"#9ca3af"}}>
              <svg width="58" height="14" viewBox="0 0 58 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="11" fontFamily="system-ui,sans-serif" fontSize="9" fontWeight="500" fill="#9ca3af">Powered by</text>
                <text x="37" y="11" fontFamily="system-ui,sans-serif" fontSize="10" fontWeight="700" fill="#635bff">Stripe</text>
              </svg>
            </div>
          </div>
        </div>

        <p style={{textAlign:"center",fontSize:"11px",color:"#9ca3af",marginTop:"16px",lineHeight:"1.6"}}>
          Card details are collected by Stripe's secure infrastructure.<br/>
          Playroom Toys never receives or stores your full card number.
        </p>

        <div style={{textAlign:"center",marginTop:"20px"}}>
          <a href="/" style={{fontSize:"12px",color:"#636e72",textDecoration:"none",borderBottom:"1px solid #d0d7de",paddingBottom:"1px"}}>← Back to Playroom Toys</a>
        </div>
      </div>
    </div>
  );
}
