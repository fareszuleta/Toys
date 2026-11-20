(function(){
  var mount=document.getElementById('stripe-mount');
  if(!mount)return;
  var key=document.querySelector('meta[name="stripe-pk"]');
  if(typeof Stripe!=='undefined'&&key&&key.getAttribute('content')){
    try{
      var stripe=Stripe(key.getAttribute('content'));
      var elements=stripe.elements();
      var el=document.createElement('div');el.id='stripe-card-element';
      mount.replaceWith(el);
      var card=elements.create('card',{style:{base:{fontSize:'15px',color:'#1a1f36',fontFamily:'system-ui,sans-serif','::placeholder':{color:'#aab7c4'}},invalid:{color:'#fa755a'}}});
      card.mount('#stripe-card-element');
      card.on('change',function(e){var err=document.getElementById('card-errors');if(err)err.textContent=e.error?e.error.message:'';});
      return;
    }catch(e){}
  }
  mount.innerHTML='<div class="fallback-form"><div class="field-wrap"><div class="field-label">Card number</div><input class="field-input" type="text" placeholder="1234 1234 1234 1234" autocomplete="cc-number" inputmode="numeric" maxlength="19"/></div><div class="field-row"><div class="field-wrap"><div class="field-label">Expiry</div><input class="field-input" type="text" placeholder="MM / YY" autocomplete="cc-exp" maxlength="7"/></div><div class="field-wrap"><div class="field-label">CVC</div><input class="field-input" type="text" placeholder="•••" autocomplete="cc-csc" maxlength="4"/></div></div><div class="field-wrap"><div class="field-label">Name on card</div><input class="field-input" type="text" placeholder="Full name as it appears on card" autocomplete="cc-name" maxlength="80"/></div></div>';
})();
