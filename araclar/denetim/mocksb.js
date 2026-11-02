window.supabase = { createClient: function(){
  const srv = window.__srv = window.__srv || JSON.parse(localStorage.getItem('__srvInit')||'{}');
  let session = null, cbs = [], email = '';
  const fire = (e,s)=>cbs.forEach(cb=>cb(e,s));
  return {
    auth: {
      getSession: async()=>({data:{session}}),
      onAuthStateChange: (cb)=>{ cbs.push(cb); return {data:{subscription:{unsubscribe(){}}}}; },
      signInWithOtp: async(o)=>{ email=o.email; window.__otp=o; return {error:null}; },
      verifyOtp: async(o)=>{ if(o.token!=='123456') return {data:{}, error:{message:'Token has expired or is invalid'}}; session={user:{id:'u1', email:o.email}}; setTimeout(()=>fire('SIGNED_IN',session),0); return {data:{user:session.user, session}, error:null}; },
      signInWithOAuth: async()=>({error:null}),
      signOut: async()=>{ session=null; fire('SIGNED_OUT',null); return {error:null}; }
    },
    from: (t)=>({
      select: ()=>({ eq: ()=>({ maybeSingle: async()=>({data: srv.row?{data:JSON.parse(JSON.stringify(srv.row.data)), updated_at:srv.row.updated_at}:null, error:null}) }) }),
      upsert: async(row)=>{ srv.row=JSON.parse(JSON.stringify(row)); srv.pushes=(srv.pushes||0)+1; return {error:null}; }
    }),
    rpc: async(n)=>{ if(n==='delete_my_account'){ srv.row=null; srv.deleted=true; } return {error:null}; }
  };
}};
