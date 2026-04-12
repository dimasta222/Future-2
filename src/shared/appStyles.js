const STYLES = `
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Outfit',sans-serif;line-height:1.5;text-align:left;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
a{color:inherit}
::selection{background:#e84393;color:#fff}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:#111}
::-webkit-scrollbar-thumb{background:linear-gradient(#e84393,#6c5ce7);border-radius:3px}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes sheetIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
.hidden{display:none}
.flex{display:flex}
.flex-wrap{flex-wrap:wrap}
.justify-center{justify-content:center}
.text-center{text-align:center}
.mt-8{margin-top:2rem}
.mt-10{margin-top:2.5rem}
.mt-20{margin-top:5rem}
.mb-12{margin-bottom:3rem}
.mb-16{margin-bottom:4rem}
.gap-4{gap:1rem}
.gap-12{gap:3rem}
.flex\\!{display:flex!important}
.mobile-only{display:none}
.mobile-bottom-spacer{display:none}
.field-row{display:flex;align-items:center;gap:14px}
.field-row-label{width:92px;min-width:92px}
.field-row-content{flex:1;min-width:0}
.field-value{text-align:right;margin-left:auto}
.mobile-quick-actions{display:none;position:fixed;left:16px;right:16px;bottom:16px;z-index:120;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mobile-quick-actions a,.mobile-quick-actions button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:52px;padding:12px 10px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(12,12,18,.92);backdrop-filter:blur(16px);color:#f0eef5;text-decoration:none;font-size:13px;font-weight:600;font-family:'Outfit',sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.24)}
.mobile-quick-actions button{cursor:pointer}
.mobile-quick-primary{background:linear-gradient(135deg,#e84393,#6c5ce7)!important;border:none!important;color:#fff!important}
.mobile-quick-accent{background:linear-gradient(135deg,#0088cc,#6c5ce7)!important;border:none!important;color:#fff!important}
@media(min-width:768px){.md\\:flex{display:flex!important}.md\\:hidden\\!{display:none!important}}
@media(max-width:1180px){.nav-left{gap:16px!important}.nav-main{gap:18px!important;margin-left:24px!important}.nav-contacts{gap:10px!important;padding:8px 12px!important}.nav-contacts-stack a:first-child{font-size:13px!important}.nav-contacts-stack a:last-child{font-size:11px!important}.nav-social-btn{width:34px!important;height:34px!important}.nav-calc-btn{padding:8px 16px!important}}
@media(max-width:1040px){.nav-main{gap:14px!important}.nav-contacts-stack{display:none!important}}
.nav-left{display:flex;align-items:center;gap:24px;flex-shrink:0}
.nav-desktop-calc{display:inline-flex}
.nav-desktop-main{display:flex}
.nav-main{justify-content:flex-end;flex:1;margin-left:44px}
.nav-contacts{justify-content:center;padding:10px 14px;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)}
.nav-socials{display:flex;align-items:center;justify-content:center;gap:8px}
.mobile-nav-trigger{width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:none;align-items:center;justify-content:center;color:#f0eef5;cursor:pointer;backdrop-filter:blur(16px);box-shadow:0 10px 28px rgba(0,0,0,.18)}
.mobile-nav-overlay{position:fixed;inset:0;z-index:140;background:rgba(6,6,10,.62);backdrop-filter:blur(10px);display:flex;justify-content:flex-end;padding:12px}
.mobile-nav-sheet{width:min(340px,100%);height:100%;border-radius:28px;background:linear-gradient(180deg,rgba(18,18,28,.98),rgba(10,10,16,.98));border:1px solid rgba(255,255,255,.08);box-shadow:0 28px 80px rgba(0,0,0,.42);padding:20px 18px 24px;display:flex;flex-direction:column;gap:18px;overflow:auto;animation:sheetIn .28s cubic-bezier(.16,1,.3,1)}
.mobile-nav-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.mobile-nav-eyebrow{font-size:11px;font-weight:500;letter-spacing:2px;color:#6c5ce7;text-transform:uppercase}
.mobile-nav-title{font-size:24px;font-weight:500;margin-top:6px}
.mobile-nav-subtitle{font-size:13px;font-weight:300;color:rgba(240,238,245,.5);margin-top:6px;line-height:1.55}
.mobile-nav-close{width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:inline-flex;align-items:center;justify-content:center;color:#f0eef5;cursor:pointer;font-family:'Outfit',sans-serif;font-size:22px;flex-shrink:0}
.mobile-nav-group{display:flex;flex-direction:column;gap:8px}
.mobile-nav-link{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:#f0eef5;cursor:pointer;text-align:left;font-family:'Outfit',sans-serif;font-size:15px;font-weight:400}
.mobile-nav-link-active{border-color:rgba(232,67,147,.24);background:linear-gradient(135deg,rgba(232,67,147,.12),rgba(108,92,231,.12));color:#fff}
.mobile-nav-section-title{font-size:11px;font-weight:500;letter-spacing:2px;color:rgba(240,238,245,.34);text-transform:uppercase;padding:0 4px}
.mobile-nav-submenu{display:flex;flex-direction:column;gap:8px;padding-left:10px}
.mobile-nav-submenu .mobile-nav-link{padding:12px 14px;font-size:14px}
.mobile-nav-meta{display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}
.mobile-nav-meta a{text-decoration:none}
.mobile-nav-socials{display:flex;gap:10px}
.mobile-nav-socials a{width:42px;height:42px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.mobile-nav-actions{display:flex;flex-direction:column;gap:10px}
.mobile-nav-action{width:100%;justify-content:center}
.desktop-pricing-table{display:block}
.mobile-pricing-list{display:none}
.mobile-pricing-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03)}
.mobile-pricing-meta{min-width:0}
.mobile-pricing-price{flex-shrink:0;text-align:right}
.mobile-pricing-note{display:none}
.main-card.main-showcase-card{background:none!important;border:none!important;backdrop-filter:none!important;box-shadow:none!important;padding:0!important;transition:none!important}
.main-card.main-showcase-card:hover{background:none!important;border:none!important;transform:none!important}
.main-showcase-shell{width:min(100%,340px);margin:0 auto}
.main-showcase-meta{display:flex;flex-direction:column;gap:10px}
.main-showcase-stage{position:relative;margin-top:12px}
.main-showcase-media{position:relative;width:100%;margin:0 auto}
.main-showcase-preview{width:100%;max-width:100%;display:block;filter:drop-shadow(0 24px 40px rgba(18,14,20,.18))}
.main-showcase-swatches{position:absolute;left:clamp(10px,2vw,18px);top:clamp(12px,2.2vw,20px);display:flex;flex-direction:column;gap:clamp(6px,1vw,10px);z-index:2}
.main-showcase-swatches-title{font-size:clamp(8px,.85vw,10px);font-weight:500;letter-spacing:1px;color:#111;text-transform:uppercase;line-height:1.2;max-width:78px}
.main-showcase-swatch{width:clamp(16px,1.8vw,22px);height:clamp(16px,1.8vw,22px);border-radius:50%;border:1px solid rgba(17,17,20,.18);cursor:pointer;box-shadow:0 6px 14px rgba(0,0,0,.12);transition:border-color .25s,box-shadow .25s}
.main-showcase-swatch:hover{box-shadow:0 10px 18px rgba(0,0,0,.16)}
.main-showcase-swatch-active{border-color:#ff6b2c;box-shadow:0 0 0 3px rgba(255,107,44,.18),0 12px 24px rgba(17,14,20,.14)}
.main-showcase-size-label{font-size:10px;font-weight:500;letter-spacing:1.6px;color:rgba(240,238,245,.34);text-transform:uppercase;margin-bottom:6px}
.main-showcase-size-row{display:flex;flex-wrap:wrap;gap:6px}
.main-showcase-size-pill{padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:12px;font-weight:500;color:rgba(240,238,245,.82)}
.bp{background:linear-gradient(135deg,#e84393,#6c5ce7);border:none;color:#fff;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:500;cursor:pointer;letter-spacing:1px;position:relative;overflow:hidden;transition:all .4s;font-family:'Outfit',sans-serif}
.bp:hover{box-shadow:0 10px 40px rgba(232,67,147,.4)}
.bp::after{content:'';position:absolute;top:0;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);animation:shimmer 3s infinite}
.bo{background:0 0;border:1.5px solid rgba(232,67,147,.5);color:#e84393;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:400;cursor:pointer;transition:all .4s;font-family:'Outfit',sans-serif}
.bo:hover{background:rgba(232,67,147,.1);border-color:#e84393}
.btg{background:linear-gradient(135deg,#0088cc,#6c5ce7);border:none;color:#fff;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:500;cursor:pointer;transition:all .4s;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:10px;text-decoration:none}
.btg:hover{box-shadow:0 10px 40px rgba(0,136,204,.3)}
.bcalc{background:linear-gradient(135deg,rgba(232,67,147,.15),rgba(108,92,231,.15));border:1.5px solid rgba(232,67,147,.3);color:#f0eef5;padding:14px 36px;border-radius:50px;font-size:16px;font-weight:500;cursor:pointer;transition:all .4s;font-family:'Outfit',sans-serif;display:inline-flex;align-items:center;gap:10px}
.bcalc:hover{background:linear-gradient(135deg,rgba(232,67,147,.25),rgba(108,92,231,.25));box-shadow:0 10px 40px rgba(232,67,147,.2)}
.hero-primary:hover,.hero-secondary:hover,.hero-tertiary:hover,.hero-support:hover{transform:none!important}
.cg{background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:20px;transition:all .5s cubic-bezier(.16,1,.3,1)}
.cg:hover{background:rgba(255,255,255,.06);border-color:rgba(232,67,147,.2)}
.cs{background:rgba(255,255,255,.03);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.06);border-radius:20px}
.inf{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 20px;color:#f0eef5;font-size:15px;width:100%;outline:none;transition:all .3s;font-family:'Outfit',sans-serif}
.inf:focus{border-color:#e84393;box-shadow:0 0 20px rgba(232,67,147,.15)}
.inf::placeholder{color:rgba(240,238,245,.25)}
.nb{backdrop-filter:blur(24px) saturate(1.5);-webkit-backdrop-filter:blur(24px) saturate(1.5);isolation:isolate;transform:translateZ(0);backface-visibility:hidden}
.tb{padding:10px 24px;border-radius:50px;border:none;cursor:pointer;font-size:14px;font-weight:400;letter-spacing:.5px;transition:all .3s;font-family:'Outfit',sans-serif}
.ta{background:linear-gradient(135deg,#e84393,#6c5ce7);color:#fff}
.ti{background:rgba(255,255,255,.05);color:rgba(240,238,245,.5)}
.ti:hover{background:rgba(255,255,255,.08);color:rgba(240,238,245,.7)}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}
@media(max-width:860px){.cg2{grid-template-columns:1fr!important}}
@media(max-width:1180px){
	.constructor-shell{grid-template-columns:1fr!important}
	.constructor-preview{position:relative!important;top:auto!important}
	.constructor-shape-toolbar{flex-wrap:wrap!important}
	.constructor-shape-toolbar-main{flex:1 1 100%!important;min-width:0!important}
	.constructor-shape-popover{width:100%!important}
	.constructor-tabs-grid{display:flex!important;flex-wrap:wrap!important;gap:6px!important;justify-content:center!important}
	.constructor-tabs-button{min-height:auto!important;width:auto!important;flex:1 1 calc(20% - 6px)!important;padding:8px 6px!important;aspect-ratio:1!important;max-width:64px!important}
	.constructor-preview-stage{min-height:auto!important}
	.constructor-order-row{grid-template-columns:1fr!important;gap:6px!important}
	.constructor-order-label{white-space:normal!important}
	.constructor-order-value{text-align:left!important;overflow-wrap:break-word!important;word-break:normal!important}
}
@media(max-width:860px){
	.nav-desktop-calc,.nav-desktop-main{display:none!important}
	.section-shell{padding:80px 5%!important}
	.page-shell,.page-shell-narrow{padding-left:5%!important;padding-right:5%!important}
	.hero-shell{min-height:auto!important;padding:108px 5% 76px!important}
	.mobile-nav-trigger{display:inline-flex}
	.desktop-pricing-table{display:none!important}
	.mobile-pricing-list{display:grid!important;gap:8px!important}
	.mobile-pricing-note{display:block!important;margin-top:4px;font-size:10px;font-weight:400;color:rgba(240,238,245,.48);line-height:1.35}
	.main-showcase-stage{margin-top:12px!important}
	.main-showcase-shell{width:100%!important}
	.main-showcase-swatches{left:clamp(8px,2.4vw,16px)!important;top:clamp(10px,2.8vw,18px)!important}
	.hero-rating{flex-wrap:wrap!important;justify-content:center!important;padding:8px 16px!important}
	.hero-actions{width:100%!important;gap:10px!important;margin-top:28px!important}
	.hero-actions>*{flex:1 1 calc(50% - 10px)!important;justify-content:center!important}
	.hero-stats{width:100%!important;gap:18px!important;margin-top:42px!important}
	.hero-stat{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;min-width:0!important}
	.hero-stat-value{white-space:nowrap!important;line-height:1.05!important}
	.hero-stat-label{display:flex!important;align-items:flex-start!important;justify-content:center!important;min-height:32px!important;line-height:1.35!important;text-align:center!important}
	.textile-card-grid,.reviews-grid,.contact-grid,.size-guide-grid,.constructor-shell{grid-template-columns:1fr!important}
	.main-tshirt-grid{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;scroll-snap-type:x mandatory!important;gap:14px!important;padding-bottom:8px!important;justify-content:flex-start!important}
	.main-tshirt-grid::-webkit-scrollbar{height:4px}
	.main-tshirt-grid::-webkit-scrollbar-track{background:rgba(255,255,255,.04);border-radius:4px}
	.main-tshirt-grid::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#e84393,#6c5ce7);border-radius:4px}
	.main-tshirt-grid>*{flex:0 0 210px!important;scroll-snap-align:start!important;min-width:210px!important;max-width:210px!important;overflow:visible!important}
	.main-showcase-card .main-card-header h3{font-size:13px!important}
	.main-showcase-card .main-card-header span{font-size:13px!important}
	.main-showcase-shell{width:100%!important}
	.constructor-preview{position:relative!important;top:auto!important}
	.constructor-shape-toolbar{flex-wrap:wrap!important;justify-content:center!important}
	.constructor-shape-toolbar-main{flex:0 1 auto!important;min-width:0!important}
	.constructor-shape-toolbar>button,.constructor-shape-toolbar>div:not(.constructor-shape-toolbar-main){flex:0 1 auto!important;min-width:0!important}
	.constructor-shape-popover{width:100%!important}
	.constructor-text-toolbar-toggle{display:flex!important}
	.constructor-text-toolbar-body{display:none!important;flex-wrap:wrap!important}
	.constructor-text-toolbar-open .constructor-text-toolbar-body{display:flex!important;justify-content:center!important}
	.constructor-text-toolbar-body>*{flex:0 1 auto!important}
	.constructor-text-toolbar-open .constructor-text-toolbar-toggle{margin-bottom:10px}
	.constructor-upload-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
	.constructor-upload-grid>div{padding:5px!important;border-radius:12px!important}
	.constructor-upload-grid>div>div:first-child{border-radius:8px!important}
	.constructor-sidebar-close{display:flex!important}
	.textile-order-line{flex-direction:column!important;align-items:flex-start!important}
	.textile-order-summary{flex-direction:column!important;align-items:stretch!important}
	.textile-order-cards{justify-content:stretch!important;width:100%!important}
	.textile-order-cards>*{flex:1 1 100%!important;min-width:0!important}
	.gallery-thumb-grid{flex-wrap:nowrap!important;overflow-x:auto!important;padding-bottom:4px!important}
	.modal-shell{padding:16px!important}
	.modal-card{padding:18px!important}
	.scroll-tabs{overflow-x:auto!important;justify-content:flex-start!important;padding-bottom:4px!important;scrollbar-width:none}
	.scroll-tabs::-webkit-scrollbar{display:none}
	.pricing-table table{min-width:620px!important}
	.mobile-only{display:block}
	.mobile-quick-actions{display:grid}
	.mobile-bottom-spacer{display:block;height:92px}
}
@media(max-width:640px){
	.bp,.bo,.btg,.bcalc{padding:12px 20px!important;font-size:14px!important}
	.tb{padding:10px 16px!important;font-size:13px!important}
	.field-row{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}
	.field-row-label{width:auto!important;min-width:0!important}
	.field-row-content{width:100%!important}
	.field-value{text-align:left!important;margin-left:0!important}
	.main-showcase-shell{width:100%!important}
	.main-showcase-card .main-card-header{flex-direction:row!important;align-items:flex-start!important;justify-content:space-between!important}
	.main-showcase-card .field-row{flex-direction:row!important;align-items:center!important;gap:14px!important}
	.main-showcase-card .field-row-label{width:92px!important;min-width:92px!important}
	.main-showcase-card .field-row-content{width:auto!important;flex:1!important}
	.main-showcase-card .field-value{text-align:right!important;margin-left:auto!important}
	.main-showcase-swatches-title{font-size:clamp(8px,2.6vw,9px)!important;letter-spacing:.9px!important;max-width:72px!important}
	.main-showcase-swatch{width:clamp(16px,4.2vw,20px)!important;height:clamp(16px,4.2vw,20px)!important}
	.main-showcase-preview{width:100%!important}
	.main-card,.product-card,.review-card,.contact-card,.calc-panel,.constructor-panel{padding:22px!important}
	.main-card-header,.product-card-header{flex-direction:column!important;align-items:flex-start!important}
	.price-pill{align-self:flex-start!important}
	.hero-title{font-size:clamp(32px,9vw,46px)!important;letter-spacing:1px!important;line-height:1.16!important;margin-top:18px!important}
	.hero-subtitle{font-size:14px!important;margin-top:16px!important}
	.hero-actions>*{flex:1 1 100%!important}
	.hero-support{display:none!important}
	.hero-stats{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important}
	.calc-item-grid{grid-template-columns:1fr 1fr 1fr!important;gap:6px!important}
	.calc-item-grid input{padding:8px 4px!important;font-size:14px!important}
	.calc-item-grid label{font-size:9px!important;letter-spacing:.5px!important}
	.calc-layout-toggle-mobile{display:flex!important}
	.calc-layout-block{display:none!important}
	.calc-layout-block-visible{display:block!important}
	.qty-inline{width:100%!important;justify-content:space-between!important}
	.mobile-quick-actions{left:12px;right:12px;bottom:12px;gap:8px}
	.size-guide-grid{grid-template-columns:1fr!important}
	.gallery-thumb-grid{flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;scroll-snap-type:x mandatory!important}
	.gallery-thumb-grid>*{scroll-snap-align:start!important;min-width:200px!important;flex-shrink:0!important}
	.review-card{padding:20px!important}
	.contact-card{padding:20px!important}
	.modal-shell{padding:12px!important}
	.modal-card{padding:16px!important}
}
@media(max-width:480px){
	.page-shell,.page-shell-narrow{padding-left:16px!important;padding-right:16px!important}
	.section-shell{padding:72px 16px!important}
	.hero-shell{padding:96px 16px 64px!important}
	.nav-left{gap:12px!important}
	.hero-rating{width:100%!important}
	.pricing-table table{min-width:540px!important}
	.main-card,.product-card,.review-card,.contact-card,.constructor-panel,.calc-panel{padding:18px!important}
	.textile-card-grid,.main-tshirt-grid,.reviews-grid,.contact-grid{gap:16px!important}
	.gallery-thumb-grid>*{min-width:180px!important}
}
`;

export default STYLES;
