/* MMHVAULT APP V11 — Admin-only member transaction activity details.
 * Reads only admin-protected aggregate counts via an authenticated RPC.
 * Never fetches transaction contents, balances or notes.
 */
(() => {
  'use strict';
  if (window.__MMH_ADMIN_TX_ACTIVITY_V11) return;
  window.__MMH_ADMIN_TX_ACTIVITY_V11 = true;
  const client = window.mmhAdminClient;
  if (!client) return;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const safeCount=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
  const fmt=v=>v===null?'—':v.toLocaleString('zh-CN');
  const date=v=>{
    if (!v) return '尚未录入';
    const dt = new Date(v);
    return Number.isFinite(dt.getTime()) ?
      dt.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'})+' · 北京时间' : '—';
  };
  const isUnavailable=e=>/PGRST202|42883|not found|schema cache|does not exist/i.test(String(e?.code||'')+' '+String(e?.message||''));
  const dlg=document.createElement('dialog');
  dlg.id='adminMemberActivityDialogV11';
  dlg.className='admin-member-activity-dialog-v11';
  dlg.setAttribute('aria-labelledby','adminMemberActivityTitleV11');
  dlg.innerHTML=[
    '<div class="ama-shell-v11">',
      '<div class="ama-head-v11"><div><small>MMHVAULT · ADMIN INSIGHTS</small>',
      '<h2 id="adminMemberActivityTitleV11">会员交易活跃度</h2></div>',
      '<button class="ama-close-v11" type="button" aria-label="关闭会员详情" data-ama-close>×</button></div>',
      '<div class="ama-member-v11"><strong id="amaMemberNameV11">—</strong><span id="amaMemberNoV11">—</span></div>',
      '<p class="ama-status-v11" id="amaStatusV11" role="status" aria-live="polite">正在核对交易数量…</p>',
      '<div class="ama-grid-v11" id="amaMetricsV11" hidden>',
        '<div class="ama-metric-v11"><small>累计交易笔数</small><strong id="amaTotalV11">—</strong><span>当前保留的收支与转账记录</span></div>',
        '<div class="ama-metric-v11"><small>近 30 天新增</small><strong id="amaRecentV11">—</strong><span>按录入时间统计</span></div>',
        '<div class="ama-last-v11"><span>最近录入交易</span><strong id="amaLastV11">—</strong></div>',
      '</div>',
      '<p class="ama-note-v11">仅显示交易数量和录入时间，不展示会员的金额、分类、备注或交易内容。历史补录也计入最近新增。</p>',
    '</div>'
  ].join('');
  document.body.appendChild(dlg);
  const $=id=>document.getElementById(id);
  let request=0;
  let opener=null;
  function close() {
    request++;
    if (dlg.open) dlg.close();
    if (opener?.isConnected) opener.focus({preventScroll:true});
  }
  dlg.addEventListener('close',()=>{request++;if(opener?.isConnected)opener.focus({preventScroll:true})});
  dlg.querySelector('[data-ama-close]').addEventListener('click',close);
  dlg.addEventListener('click',e=>{if(e.target===dlg)close()});
  async function show(button) {
    const row=button.closest('.admin-user-v787');
    if (!row || !document.getElementById('users')?.contains(row) || $('dashboard')?.hidden) return;
    const userId=String(row.dataset.memberUid||'');
    if(!UUID.test(userId))return;
    opener=button;
    const token=++request;
    const ids=[...row.querySelectorAll('.admin-id-value-v787')]
      .map(v=>v.textContent?.trim()).filter(v=>v&&v!=='-');
    $('amaMemberNameV11').textContent=ids[0]||'会员';
    $('amaMemberNoV11').textContent=row.querySelector('.identity small')?.textContent?.split(' · ')[0]||'会员 ID：----';
    $('amaStatusV11').textContent='正在核对交易数量…';
    $('amaStatusV11').hidden=false;
    $('amaMetricsV11').hidden=true;
    $('amaTotalV11').textContent='—';
    $('amaRecentV11').textContent='—';
    $('amaLastV11').textContent='—';
    if (!dlg.open) {
      if(typeof dlg.showModal==='function')dlg.showModal();
      else dlg.show();
    }
    try {
      const auth=await client.auth.getUser();
      if(token!==request || !dlg.open) return;
      if(auth.error || !auth.data?.user) throw Error('SESSION_EXPIRED');
      const {data,error}=await client.rpc('mmh_admin_member_transaction_activity',{p_user_id:userId});
      if(token!==request || !dlg.open || $('dashboard')?.hidden)return;
      if(error)throw error;
      const total=safeCount(data?.total_transactions),recent=safeCount(data?.added_last_30_days);
      if(total===null || recent===null || recent>total) throw Error('INVALID_SUMMARY');
      $('amaTotalV11').textContent=fmt(total);
      $('amaRecentV11').textContent=fmt(recent);
      $('amaLastV11').textContent=date(data.last_added_at);
      $('amaStatusV11').hidden=true;
      $('amaMetricsV11').hidden=false;
    } catch(e) {
      if(token!==request || !dlg.open)return;
      $('amaStatusV11').textContent=isUnavailable(e)
        ? '会员统计服务尚未启用；需要先通过后台安全验收，再开启此功能。'
        : e.message==='SESSION_EXPIRED'?'登录已过期，请重新登录后台。'
        : '暂时无法读取交易数量，请检查网络后重新打开详情。';
      $('amaMetricsV11').hidden=true;
    }
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('.admin-member-detail-btn-v11');
    if(button)void show(button);
  });
  client.auth.onAuthStateChange(event=>{
    if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED','USER_DELETED'].includes(event))close();
  });
})();
