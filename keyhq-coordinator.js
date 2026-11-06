/* Cross-tab KeyHQ ownership. One tab owns shared Supabase subscriptions and fallback reconciliation. */
(()=>{'use strict';
  if(window.KeyHQTabCoordinator)return;
  const CHANNEL='keysuite-keyhq-v50043';
  const LEASE_MS=6500;
  const RENEW_MS=2000;

  class KeyHQTabCoordinator{
    constructor(onLeadership,onMessage){
      this.id=crypto.randomUUID();this.scope='';this.leader=false;this.campus=false;
      this.onLeadership=onLeadership;this.onMessage=onMessage;this.timer=0;this.channel=null;
      this.storageHandler=event=>{if(event.key===this.leaseKey)this.check();if(event.key===this.messageKey&&event.newValue)this.receive(event.newValue)};
      this.visibilityHandler=()=>this.check(true);
      this.unloadHandler=()=>this.release();
    }
    start(scope){
      scope=String(scope||'');if(!scope||this.scope===scope)return;
      this.stop();this.scope=scope;this.leaseKey='keysuite-keyhq-leader:'+scope;this.messageKey='keysuite-keyhq-message:'+scope;
      try{this.channel=new BroadcastChannel(CHANNEL);this.channel.onmessage=event=>this.receive(event.data)}catch(_){this.channel=null}
      window.addEventListener?.('storage',this.storageHandler);window.addEventListener?.('pagehide',this.unloadHandler);
      document.addEventListener?.('visibilitychange',this.visibilityHandler);this.check(true);this.timer=setInterval(()=>this.check(),RENEW_MS);
    }
    priority(){return document.hidden?0:(this.campus?3:1)}
    setCampusActive(active){this.campus=Boolean(active);this.check(true)}
    readLease(){try{return JSON.parse(localStorage.getItem(this.leaseKey)||'null')}catch(_){return null}}
    writeLease(){
      const lease={id:this.id,expires:Date.now()+LEASE_MS,priority:this.priority()};
      try{localStorage.setItem(this.leaseKey,JSON.stringify(lease));return this.readLease()?.id===this.id}catch(_){return true}
    }
    check(force=false){
      if(!this.scope)return;const now=Date.now(),current=this.readLease(),mine=current?.id===this.id;
      const expired=!current||Number(current.expires)<=now;
      const canClaim=expired||mine||this.priority()>Number(current?.priority||0);
      let next=mine;if(canClaim&&(force||mine||expired||this.priority()>Number(current?.priority||0)))next=this.writeLease();
      this.setLeader(next);
    }
    setLeader(value){value=Boolean(value);if(value===this.leader)return;this.leader=value;this.onLeadership?.(value)}
    publish(kind,payload){
      if(!this.scope)return;const message={scope:this.scope,source:this.id,kind,payload,at:Date.now()};
      if(this.channel){try{this.channel.postMessage(message)}catch(_){}}
      else try{localStorage.setItem(this.messageKey,JSON.stringify(message));localStorage.removeItem(this.messageKey)}catch(_){}
    }
    receive(raw){
      let message=raw;try{if(typeof raw==='string')message=JSON.parse(raw)}catch(_){return}
      if(!message||message.scope!==this.scope||message.source===this.id)return;this.onMessage?.(message.kind,message.payload,message.source);
    }
    release(){
      if(this.leader){try{const lease=this.readLease();if(lease?.id===this.id)localStorage.removeItem(this.leaseKey)}catch(_){}this.publish('leader-released',{})}
      this.setLeader(false);
    }
    stop(){
      clearInterval(this.timer);this.timer=0;if(this.scope)this.release();
      window.removeEventListener?.('storage',this.storageHandler);window.removeEventListener?.('pagehide',this.unloadHandler);
      document.removeEventListener?.('visibilitychange',this.visibilityHandler);try{this.channel?.close()}catch(_){}this.channel=null;this.scope='';
    }
  }
  window.KeyHQTabCoordinator=KeyHQTabCoordinator;
})();
