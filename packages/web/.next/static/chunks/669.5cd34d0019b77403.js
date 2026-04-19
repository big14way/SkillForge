"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[669],{4624:(t,e,i)=>{var a=i(93112),r=i(96264);i(33989);var o=i(84846),n=i(29617);let s=(0,a.AH)`
  :host {
    display: flex;
    justify-content: center;
    align-items: center;
    height: var(--wui-spacing-m);
    padding: 0 var(--wui-spacing-3xs) !important;
    border-radius: var(--wui-border-radius-5xs);
    transition:
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius, background-color;
  }

  :host > wui-text {
    transform: translateY(5%);
  }

  :host([data-variant='main']) {
    background-color: var(--wui-color-accent-glass-015);
    color: var(--wui-color-accent-100);
  }

  :host([data-variant='shade']) {
    background-color: var(--wui-color-gray-glass-010);
    color: var(--wui-color-fg-200);
  }

  :host([data-variant='success']) {
    background-color: var(--wui-icon-box-bg-success-100);
    color: var(--wui-color-success-100);
  }

  :host([data-variant='error']) {
    background-color: var(--wui-icon-box-bg-error-100);
    color: var(--wui-color-error-100);
  }

  :host([data-size='lg']) {
    padding: 11px 5px !important;
  }

  :host([data-size='lg']) > wui-text {
    transform: translateY(2%);
  }
`;var l=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let c=class extends a.WF{constructor(){super(...arguments),this.variant="main",this.size="lg"}render(){this.dataset.variant=this.variant,this.dataset.size=this.size;let t="md"===this.size?"mini-700":"micro-700";return(0,a.qy)`
      <wui-text data-variant=${this.variant} variant=${t} color="inherit">
        <slot></slot>
      </wui-text>
    `}};c.styles=[o.W5,s],l([(0,r.MZ)()],c.prototype,"variant",void 0),l([(0,r.MZ)()],c.prototype,"size",void 0),c=l([(0,n.E)("wui-tag")],c)},27213:(t,e,i)=>{i(41563)},33989:(t,e,i)=>{var a=i(93112),r=i(96264),o=i(62071),n=i(84846),s=i(29617);let l=(0,a.AH)`
  :host {
    display: inline-flex !important;
  }

  slot {
    width: 100%;
    display: inline-block;
    font-style: normal;
    font-family: var(--wui-font-family);
    font-feature-settings:
      'tnum' on,
      'lnum' on,
      'case' on;
    line-height: 130%;
    font-weight: var(--wui-font-weight-regular);
    overflow: inherit;
    text-overflow: inherit;
    text-align: var(--local-align);
    color: var(--local-color);
  }

  .wui-line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }

  .wui-line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .wui-font-medium-400 {
    font-size: var(--wui-font-size-medium);
    font-weight: var(--wui-font-weight-light);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-medium-600 {
    font-size: var(--wui-font-size-medium);
    letter-spacing: var(--wui-letter-spacing-medium);
  }

  .wui-font-title-600 {
    font-size: var(--wui-font-size-title);
    letter-spacing: var(--wui-letter-spacing-title);
  }

  .wui-font-title-6-600 {
    font-size: var(--wui-font-size-title-6);
    letter-spacing: var(--wui-letter-spacing-title-6);
  }

  .wui-font-mini-700 {
    font-size: var(--wui-font-size-mini);
    letter-spacing: var(--wui-letter-spacing-mini);
    text-transform: uppercase;
  }

  .wui-font-large-500,
  .wui-font-large-600,
  .wui-font-large-700 {
    font-size: var(--wui-font-size-large);
    letter-spacing: var(--wui-letter-spacing-large);
  }

  .wui-font-2xl-500,
  .wui-font-2xl-600,
  .wui-font-2xl-700 {
    font-size: var(--wui-font-size-2xl);
    letter-spacing: var(--wui-letter-spacing-2xl);
  }

  .wui-font-paragraph-400,
  .wui-font-paragraph-500,
  .wui-font-paragraph-600,
  .wui-font-paragraph-700 {
    font-size: var(--wui-font-size-paragraph);
    letter-spacing: var(--wui-letter-spacing-paragraph);
  }

  .wui-font-small-400,
  .wui-font-small-500,
  .wui-font-small-600 {
    font-size: var(--wui-font-size-small);
    letter-spacing: var(--wui-letter-spacing-small);
  }

  .wui-font-tiny-400,
  .wui-font-tiny-500,
  .wui-font-tiny-600 {
    font-size: var(--wui-font-size-tiny);
    letter-spacing: var(--wui-letter-spacing-tiny);
  }

  .wui-font-micro-700,
  .wui-font-micro-600 {
    font-size: var(--wui-font-size-micro);
    letter-spacing: var(--wui-letter-spacing-micro);
    text-transform: uppercase;
  }

  .wui-font-tiny-400,
  .wui-font-small-400,
  .wui-font-medium-400,
  .wui-font-paragraph-400 {
    font-weight: var(--wui-font-weight-light);
  }

  .wui-font-large-700,
  .wui-font-paragraph-700,
  .wui-font-micro-700,
  .wui-font-mini-700 {
    font-weight: var(--wui-font-weight-bold);
  }

  .wui-font-medium-600,
  .wui-font-medium-title-600,
  .wui-font-title-6-600,
  .wui-font-large-600,
  .wui-font-paragraph-600,
  .wui-font-small-600,
  .wui-font-tiny-600,
  .wui-font-micro-600 {
    font-weight: var(--wui-font-weight-medium);
  }

  :host([disabled]) {
    opacity: 0.4;
  }
`;var c=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let h=class extends a.WF{constructor(){super(...arguments),this.variant="paragraph-500",this.color="fg-300",this.align="left",this.lineClamp=void 0}render(){let t={[`wui-font-${this.variant}`]:!0,[`wui-color-${this.color}`]:!0,[`wui-line-clamp-${this.lineClamp}`]:!!this.lineClamp};return this.style.cssText=`
      --local-align: ${this.align};
      --local-color: var(--wui-color-${this.color});
    `,(0,a.qy)`<slot class=${(0,o.H)(t)}></slot>`}};h.styles=[n.W5,l],c([(0,r.MZ)()],h.prototype,"variant",void 0),c([(0,r.MZ)()],h.prototype,"color",void 0),c([(0,r.MZ)()],h.prototype,"align",void 0),c([(0,r.MZ)()],h.prototype,"lineClamp",void 0),h=c([(0,s.E)("wui-text")],h)},36651:(t,e,i)=>{var a=i(93112),r=i(96264),o=i(84846),n=i(29617);let s=(0,a.AH)`
  :host {
    display: block;
    width: var(--local-width);
    height: var(--local-height);
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    border-radius: inherit;
  }
`;var l=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let c=class extends a.WF{constructor(){super(...arguments),this.src="./path/to/image.jpg",this.alt="Image",this.size=void 0}render(){return this.style.cssText=`
      --local-width: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};
      --local-height: ${this.size?`var(--wui-icon-size-${this.size});`:"100%"};
      `,(0,a.qy)`<img src=${this.src} alt=${this.alt} @error=${this.handleImageError} />`}handleImageError(){this.dispatchEvent(new CustomEvent("onLoadError",{bubbles:!0,composed:!0}))}};c.styles=[o.W5,o.ck,s],l([(0,r.MZ)()],c.prototype,"src",void 0),l([(0,r.MZ)()],c.prototype,"alt",void 0),l([(0,r.MZ)()],c.prototype,"size",void 0),c=l([(0,n.E)("wui-image")],c)},41563:(t,e,i)=>{var a=i(93112),r=i(96264),o=i(84846),n=i(90143),s=i(29617);let l=(0,a.AH)`
  :host {
    display: flex;
    width: inherit;
    height: inherit;
  }
`;var c=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let h=class extends a.WF{render(){return this.style.cssText=`
      flex-direction: ${this.flexDirection};
      flex-wrap: ${this.flexWrap};
      flex-basis: ${this.flexBasis};
      flex-grow: ${this.flexGrow};
      flex-shrink: ${this.flexShrink};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      column-gap: ${this.columnGap&&`var(--wui-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--wui-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--wui-spacing-${this.gap})`};
      padding-top: ${this.padding&&n.Z.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&n.Z.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&n.Z.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&n.Z.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&n.Z.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&n.Z.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&n.Z.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&n.Z.getSpacingStyles(this.margin,3)};
    `,(0,a.qy)`<slot></slot>`}};h.styles=[o.W5,l],c([(0,r.MZ)()],h.prototype,"flexDirection",void 0),c([(0,r.MZ)()],h.prototype,"flexWrap",void 0),c([(0,r.MZ)()],h.prototype,"flexBasis",void 0),c([(0,r.MZ)()],h.prototype,"flexGrow",void 0),c([(0,r.MZ)()],h.prototype,"flexShrink",void 0),c([(0,r.MZ)()],h.prototype,"alignItems",void 0),c([(0,r.MZ)()],h.prototype,"justifyContent",void 0),c([(0,r.MZ)()],h.prototype,"columnGap",void 0),c([(0,r.MZ)()],h.prototype,"rowGap",void 0),c([(0,r.MZ)()],h.prototype,"gap",void 0),c([(0,r.MZ)()],h.prototype,"padding",void 0),c([(0,r.MZ)()],h.prototype,"margin",void 0),h=c([(0,s.E)("wui-flex")],h)},41845:(t,e,i)=>{i.d(e,{OA:()=>a,WL:()=>o,u$:()=>r});let a={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},r=t=>(...e)=>({_$litDirective$:t,values:e});class o{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}},49915:(t,e,i)=>{i(88176)},51861:(t,e,i)=>{i(33989)},52945:(t,e,i)=>{i.d(e,{Rt:()=>o,sO:()=>r});let{I:a}=i(86617).ge,r=t=>null===t||"object"!=typeof t&&"function"!=typeof t,o=t=>void 0===t.strings},62071:(t,e,i)=>{i.d(e,{H:()=>o});var a=i(86617),r=i(41845);let o=(0,r.u$)(class extends r.WL{constructor(t){if(super(t),t.type!==r.OA.ATTRIBUTE||"class"!==t.name||t.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(t){return" "+Object.keys(t).filter(e=>t[e]).join(" ")+" "}update(t,[e]){if(void 0===this.st){for(let i in this.st=new Set,void 0!==t.strings&&(this.nt=new Set(t.strings.join(" ").split(/\s/).filter(t=>""!==t))),e)e[i]&&!this.nt?.has(i)&&this.st.add(i);return this.render(e)}let i=t.element.classList;for(let t of this.st)t in e||(i.remove(t),this.st.delete(t));for(let t in e){let a=!!e[t];a===this.st.has(t)||this.nt?.has(t)||(a?(i.add(t),this.st.add(t)):(i.remove(t),this.st.delete(t)))}return a.c0}})},66439:(t,e,i)=>{var a=i(93112),r=i(96264);i(88176);var o=i(84846),n=i(29617);let s=(0,a.AH)`
  :host {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    background-color: var(--wui-color-gray-glass-020);
    border-radius: var(--local-border-radius);
    border: var(--local-border);
    box-sizing: content-box;
    width: var(--local-size);
    height: var(--local-size);
    min-height: var(--local-size);
    min-width: var(--local-size);
  }

  @supports (background: color-mix(in srgb, white 50%, black)) {
    :host {
      background-color: color-mix(in srgb, var(--local-bg-value) var(--local-bg-mix), transparent);
    }
  }
`;var l=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let c=class extends a.WF{constructor(){super(...arguments),this.size="md",this.backgroundColor="accent-100",this.iconColor="accent-100",this.background="transparent",this.border=!1,this.borderColor="wui-color-bg-125",this.icon="copy"}render(){let t=this.iconSize||this.size,e="lg"===this.size,i="xl"===this.size,r="gray"===this.background,o="opaque"===this.background,n="accent-100"===this.backgroundColor&&o||"success-100"===this.backgroundColor&&o||"error-100"===this.backgroundColor&&o||"inverse-100"===this.backgroundColor&&o,s=`var(--wui-color-${this.backgroundColor})`;return n?s=`var(--wui-icon-box-bg-${this.backgroundColor})`:r&&(s=`var(--wui-color-gray-${this.backgroundColor})`),this.style.cssText=`
       --local-bg-value: ${s};
       --local-bg-mix: ${n||r?"100%":e?"12%":"16%"};
       --local-border-radius: var(--wui-border-radius-${e?"xxs":i?"s":"3xl"});
       --local-size: var(--wui-icon-box-size-${this.size});
       --local-border: ${"wui-color-bg-125"===this.borderColor?"2px":"1px"} solid ${this.border?`var(--${this.borderColor})`:"transparent"}
   `,(0,a.qy)` <wui-icon color=${this.iconColor} size=${t} name=${this.icon}></wui-icon> `}};c.styles=[o.W5,o.fD,s],l([(0,r.MZ)()],c.prototype,"size",void 0),l([(0,r.MZ)()],c.prototype,"backgroundColor",void 0),l([(0,r.MZ)()],c.prototype,"iconColor",void 0),l([(0,r.MZ)()],c.prototype,"iconSize",void 0),l([(0,r.MZ)()],c.prototype,"background",void 0),l([(0,r.MZ)({type:Boolean})],c.prototype,"border",void 0),l([(0,r.MZ)()],c.prototype,"borderColor",void 0),l([(0,r.MZ)()],c.prototype,"icon",void 0),c=l([(0,n.E)("wui-icon-box")],c)},71517:(t,e,i)=>{i.d(e,{J:()=>r});var a=i(86617);let r=t=>t??a.s6},83884:(t,e,i)=>{var a=i(93112),r=i(96264),o=i(84846),n=i(29617);let s=(0,a.AH)`
  :host {
    display: flex;
  }

  :host([data-size='sm']) > svg {
    width: 12px;
    height: 12px;
  }

  :host([data-size='md']) > svg {
    width: 16px;
    height: 16px;
  }

  :host([data-size='lg']) > svg {
    width: 24px;
    height: 24px;
  }

  :host([data-size='xl']) > svg {
    width: 32px;
    height: 32px;
  }

  svg {
    animation: rotate 2s linear infinite;
  }

  circle {
    fill: none;
    stroke: var(--local-color);
    stroke-width: 4px;
    stroke-dasharray: 1, 124;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }

  :host([data-size='md']) > svg > circle {
    stroke-width: 6px;
  }

  :host([data-size='sm']) > svg > circle {
    stroke-width: 8px;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 124;
      stroke-dashoffset: 0;
    }

    50% {
      stroke-dasharray: 90, 124;
      stroke-dashoffset: -35;
    }

    100% {
      stroke-dashoffset: -125;
    }
  }
`;var l=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let c=class extends a.WF{constructor(){super(...arguments),this.color="accent-100",this.size="lg"}render(){return this.style.cssText=`--local-color: ${"inherit"===this.color?"inherit":`var(--wui-color-${this.color})`}`,this.dataset.size=this.size,(0,a.qy)`<svg viewBox="25 25 50 50">
      <circle r="20" cy="50" cx="50"></circle>
    </svg>`}};c.styles=[o.W5,s],l([(0,r.MZ)()],c.prototype,"color",void 0),l([(0,r.MZ)()],c.prototype,"size",void 0),c=l([(0,n.E)("wui-loading-spinner")],c)},88176:(t,e,i)=>{var a=i(93112),r=i(96264),o=i(86617),n=i(52945),s=i(94032);class l{constructor(t){this.G=t}disconnect(){this.G=void 0}reconnect(t){this.G=t}deref(){return this.G}}class c{constructor(){this.Y=void 0,this.Z=void 0}get(){return this.Y}pause(){this.Y??=new Promise(t=>this.Z=t)}resume(){this.Z?.(),this.Y=this.Z=void 0}}var h=i(41845);let d=t=>!(0,n.sO)(t)&&"function"==typeof t.then;class g extends s.Kq{constructor(){super(...arguments),this._$Cwt=0x3fffffff,this._$Cbt=[],this._$CK=new l(this),this._$CX=new c}render(...t){return t.find(t=>!d(t))??o.c0}update(t,e){let i=this._$Cbt,a=i.length;this._$Cbt=e;let r=this._$CK,n=this._$CX;this.isConnected||this.disconnected();for(let t=0;t<e.length&&!(t>this._$Cwt);t++){let o=e[t];if(!d(o))return this._$Cwt=t,o;t<a&&o===i[t]||(this._$Cwt=0x3fffffff,a=0,Promise.resolve(o).then(async t=>{for(;n.get();)await n.get();let e=r.deref();if(void 0!==e){let i=e._$Cbt.indexOf(o);i>-1&&i<e._$Cwt&&(e._$Cwt=i,e.setValue(t))}}))}return o.c0}disconnected(){this._$CK.disconnect(),this._$CX.pause()}reconnected(){this._$CK.reconnect(this),this._$CX.resume()}}let p=(0,h.u$)(g);class w{constructor(){this.cache=new Map}set(t,e){this.cache.set(t,e)}get(t){return this.cache.get(t)}has(t){return this.cache.has(t)}delete(t){this.cache.delete(t)}clear(){this.cache.clear()}}let u=new w;var v=i(84846),f=i(29617);let y=(0,a.AH)`
  :host {
    display: flex;
    aspect-ratio: var(--local-aspect-ratio);
    color: var(--local-color);
    width: var(--local-width);
  }

  svg {
    width: inherit;
    height: inherit;
    object-fit: contain;
    object-position: center;
  }

  .fallback {
    width: var(--local-width);
    height: var(--local-height);
  }
`;var b=function(t,e,i,a){var r,o=arguments.length,n=o<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var s=t.length-1;s>=0;s--)(r=t[s])&&(n=(o<3?r(n):o>3?r(e,i,n):r(e,i))||n);return o>3&&n&&Object.defineProperty(e,i,n),n};let m={add:async()=>(await i.e(4747).then(i.bind(i,64747))).addSvg,allWallets:async()=>(await i.e(2448).then(i.bind(i,22448))).allWalletsSvg,arrowBottomCircle:async()=>(await i.e(8802).then(i.bind(i,8802))).arrowBottomCircleSvg,appStore:async()=>(await i.e(5215).then(i.bind(i,55215))).appStoreSvg,apple:async()=>(await i.e(1064).then(i.bind(i,61064))).appleSvg,arrowBottom:async()=>(await i.e(8071).then(i.bind(i,78071))).arrowBottomSvg,arrowLeft:async()=>(await i.e(8177).then(i.bind(i,88177))).arrowLeftSvg,arrowRight:async()=>(await i.e(7178).then(i.bind(i,77178))).arrowRightSvg,arrowTop:async()=>(await i.e(6131).then(i.bind(i,46131))).arrowTopSvg,bank:async()=>(await i.e(6050).then(i.bind(i,26050))).bankSvg,browser:async()=>(await i.e(7816).then(i.bind(i,17816))).browserSvg,card:async()=>(await i.e(4078).then(i.bind(i,24078))).cardSvg,checkmark:async()=>(await i.e(8761).then(i.bind(i,98761))).checkmarkSvg,checkmarkBold:async()=>(await i.e(799).then(i.bind(i,80799))).checkmarkBoldSvg,chevronBottom:async()=>(await i.e(2657).then(i.bind(i,42657))).chevronBottomSvg,chevronLeft:async()=>(await i.e(7539).then(i.bind(i,97539))).chevronLeftSvg,chevronRight:async()=>(await i.e(6604).then(i.bind(i,26604))).chevronRightSvg,chevronTop:async()=>(await i.e(6121).then(i.bind(i,86121))).chevronTopSvg,chromeStore:async()=>(await i.e(1150).then(i.bind(i,91150))).chromeStoreSvg,clock:async()=>(await i.e(7850).then(i.bind(i,97850))).clockSvg,close:async()=>(await i.e(1232).then(i.bind(i,11232))).closeSvg,compass:async()=>(await i.e(7296).then(i.bind(i,67296))).compassSvg,coinPlaceholder:async()=>(await i.e(4126).then(i.bind(i,74126))).coinPlaceholderSvg,copy:async()=>(await i.e(693).then(i.bind(i,60693))).copySvg,cursor:async()=>(await i.e(6950).then(i.bind(i,46950))).cursorSvg,cursorTransparent:async()=>(await i.e(5633).then(i.bind(i,5633))).cursorTransparentSvg,desktop:async()=>(await i.e(6092).then(i.bind(i,46092))).desktopSvg,disconnect:async()=>(await i.e(8290).then(i.bind(i,68290))).disconnectSvg,discord:async()=>(await i.e(6840).then(i.bind(i,6840))).discordSvg,etherscan:async()=>(await i.e(3365).then(i.bind(i,33365))).etherscanSvg,extension:async()=>(await i.e(5089).then(i.bind(i,75089))).extensionSvg,externalLink:async()=>(await i.e(7098).then(i.bind(i,77098))).externalLinkSvg,facebook:async()=>(await i.e(488).then(i.bind(i,60488))).facebookSvg,farcaster:async()=>(await i.e(2973).then(i.bind(i,12973))).farcasterSvg,filters:async()=>(await i.e(3303).then(i.bind(i,13303))).filtersSvg,github:async()=>(await i.e(4411).then(i.bind(i,34411))).githubSvg,google:async()=>(await i.e(219).then(i.bind(i,82600))).googleSvg,helpCircle:async()=>(await i.e(538).then(i.bind(i,80538))).helpCircleSvg,image:async()=>(await i.e(1661).then(i.bind(i,21661))).imageSvg,id:async()=>(await i.e(6053).then(i.bind(i,86053))).idSvg,infoCircle:async()=>(await i.e(8795).then(i.bind(i,98795))).infoCircleSvg,lightbulb:async()=>(await i.e(5039).then(i.bind(i,5039))).lightbulbSvg,mail:async()=>(await i.e(9331).then(i.bind(i,79331))).mailSvg,mobile:async()=>(await i.e(738).then(i.bind(i,30738))).mobileSvg,more:async()=>(await i.e(9833).then(i.bind(i,29833))).moreSvg,networkPlaceholder:async()=>(await i.e(9594).then(i.bind(i,9594))).networkPlaceholderSvg,nftPlaceholder:async()=>(await i.e(9329).then(i.bind(i,89329))).nftPlaceholderSvg,off:async()=>(await i.e(8277).then(i.bind(i,18277))).offSvg,playStore:async()=>(await i.e(8714).then(i.bind(i,28714))).playStoreSvg,plus:async()=>(await i.e(104).then(i.bind(i,10104))).plusSvg,qrCode:async()=>(await i.e(3843).then(i.bind(i,83843))).qrCodeIcon,recycleHorizontal:async()=>(await i.e(2116).then(i.bind(i,32116))).recycleHorizontalSvg,refresh:async()=>(await i.e(5115).then(i.bind(i,85115))).refreshSvg,search:async()=>(await i.e(5652).then(i.bind(i,55652))).searchSvg,send:async()=>(await i.e(9318).then(i.bind(i,39318))).sendSvg,swapHorizontal:async()=>(await i.e(7579).then(i.bind(i,77579))).swapHorizontalSvg,swapHorizontalMedium:async()=>(await i.e(7068).then(i.bind(i,97068))).swapHorizontalMediumSvg,swapHorizontalBold:async()=>(await i.e(5388).then(i.bind(i,95388))).swapHorizontalBoldSvg,swapHorizontalRoundedBold:async()=>(await i.e(4067).then(i.bind(i,64067))).swapHorizontalRoundedBoldSvg,swapVertical:async()=>(await i.e(3014).then(i.bind(i,50633))).swapVerticalSvg,telegram:async()=>(await i.e(3023).then(i.bind(i,93023))).telegramSvg,threeDots:async()=>(await i.e(4595).then(i.bind(i,74595))).threeDotsSvg,twitch:async()=>(await i.e(131).then(i.bind(i,90131))).twitchSvg,twitter:async()=>(await i.e(8400).then(i.bind(i,58400))).xSvg,twitterIcon:async()=>(await i.e(1030).then(i.bind(i,31030))).twitterIconSvg,verify:async()=>(await i.e(633).then(i.bind(i,40633))).verifySvg,verifyFilled:async()=>(await i.e(8096).then(i.bind(i,8096))).verifyFilledSvg,wallet:async()=>(await i.e(5017).then(i.bind(i,45017))).walletSvg,walletConnect:async()=>(await i.e(5477).then(i.bind(i,95477))).walletConnectSvg,walletConnectLightBrown:async()=>(await i.e(5477).then(i.bind(i,95477))).walletConnectLightBrownSvg,walletConnectBrown:async()=>(await i.e(5477).then(i.bind(i,95477))).walletConnectBrownSvg,walletPlaceholder:async()=>(await i.e(3421).then(i.bind(i,83421))).walletPlaceholderSvg,warningCircle:async()=>(await i.e(3079).then(i.bind(i,83079))).warningCircleSvg,x:async()=>(await i.e(8400).then(i.bind(i,58400))).xSvg,info:async()=>(await i.e(3700).then(i.bind(i,43700))).infoSvg,exclamationTriangle:async()=>(await i.e(6612).then(i.bind(i,16612))).exclamationTriangleSvg,reown:async()=>(await i.e(2249).then(i.bind(i,92249))).reownSvg};async function $(t){if(u.has(t))return u.get(t);let e=(m[t]??m.copy)();return u.set(t,e),e}let S=class extends a.WF{constructor(){super(...arguments),this.size="md",this.name="copy",this.color="fg-300",this.aspectRatio="1 / 1"}render(){return this.style.cssText=`
      --local-color: var(--wui-color-${this.color});
      --local-width: var(--wui-icon-size-${this.size});
      --local-aspect-ratio: ${this.aspectRatio}
    `,(0,a.qy)`${p($(this.name),(0,a.qy)`<div class="fallback"></div>`)}`}};S.styles=[v.W5,v.ck,y],b([(0,r.MZ)()],S.prototype,"size",void 0),b([(0,r.MZ)()],S.prototype,"name",void 0),b([(0,r.MZ)()],S.prototype,"color",void 0),b([(0,r.MZ)()],S.prototype,"aspectRatio",void 0),S=b([(0,f.E)("wui-icon")],S)},94032:(t,e,i)=>{i.d(e,{Kq:()=>d});var a=i(52945),r=i(41845);let o=(t,e)=>{let i=t._$AN;if(void 0===i)return!1;for(let t of i)t._$AO?.(e,!1),o(t,e);return!0},n=t=>{let e,i;do{if(void 0===(e=t._$AM))break;(i=e._$AN).delete(t),t=e}while(0===i?.size)},s=t=>{for(let e;e=t._$AM;t=e){let i=e._$AN;if(void 0===i)e._$AN=i=new Set;else if(i.has(t))break;i.add(t),h(e)}};function l(t){void 0!==this._$AN?(n(this),this._$AM=t,s(this)):this._$AM=t}function c(t,e=!1,i=0){let a=this._$AH,r=this._$AN;if(void 0!==r&&0!==r.size)if(e)if(Array.isArray(a))for(let t=i;t<a.length;t++)o(a[t],!1),n(a[t]);else null!=a&&(o(a,!1),n(a));else o(this,t)}let h=t=>{t.type==r.OA.CHILD&&(t._$AP??=c,t._$AQ??=l)};class d extends r.WL{constructor(){super(...arguments),this._$AN=void 0}_$AT(t,e,i){super._$AT(t,e,i),s(this),this.isConnected=t._$AU}_$AO(t,e=!0){t!==this.isConnected&&(this.isConnected=t,t?this.reconnected?.():this.disconnected?.()),e&&(o(this,t),n(this))}setValue(t){if((0,a.Rt)(this._$Ct))this._$Ct._$AI(t,this);else{let e=[...this._$Ct._$AH];e[this._$Ci]=t,this._$Ct._$AI(e,this,0)}}disconnected(){}reconnected(){}}},96264:(t,e,i)=>{i.d(e,{MZ:()=>o,wk:()=>n});var a=i(60633);let r={attribute:!0,type:String,converter:a.W3,reflect:!1,hasChanged:a.Ec};function o(t){return(e,i)=>"object"==typeof i?((t=r,e,i)=>{let{kind:a,metadata:o}=i,n=globalThis.litPropertyMetadata.get(o);if(void 0===n&&globalThis.litPropertyMetadata.set(o,n=new Map),"setter"===a&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===a){let{name:a}=i;return{set(i){let r=e.get.call(this);e.set.call(this,i),this.requestUpdate(a,r,t,!0,i)},init(e){return void 0!==e&&this.C(a,void 0,t,e),e}}}if("setter"===a){let{name:a}=i;return function(i){let r=this[a];e.call(this,i),this.requestUpdate(a,r,t,!0,i)}}throw Error("Unsupported decorator location: "+a)})(t,e,i):((t,e,i)=>{let a=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),a?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}function n(t){return o({...t,state:!0,attribute:!1})}}}]);