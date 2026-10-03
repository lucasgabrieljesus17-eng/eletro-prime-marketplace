async function api(url,opts={}){const r=await fetch(url,opts);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Erro");return d}
const $=id=>document.getElementById(id); let editing=null;

async function init(){
  const me=await api("/api/admin/me");
  if(me.authenticated){$("login").classList.add("hidden");$("app").classList.remove("hidden");$("adminEmail").textContent=me.email;loadDashboard();}
}
async function login(){
  try{const d=await api("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:$("email").value,password:$("password").value})});$("login").classList.add("hidden");$("app").classList.remove("hidden");$("adminEmail").textContent=d.email||$("email").value;loadDashboard()}catch(e){$("loginMsg").textContent=e.message}
}
async function logout(){await api("/api/admin/logout",{method:"POST"});location.reload()}
function show(id){document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");if(id==="dashboard")loadDashboard();if(id==="products")loadProducts();if(id==="banners")loadBanners();if(id==="orders")loadOrders()}
async function loadDashboard(){const s=await api("/api/admin/stats");$("stats").innerHTML=[["Faturamento",money(s.revenue)],["Pedidos",s.orders],["Produtos",s.products],["Estoque baixo",s.lowStock]].map(x=>`<div class="stat"><span class="muted">${x[0]}</span><strong>${x[1]}</strong></div>`).join("")}
async function loadProducts(){
 const ps=await api("/api/admin/products");
 $("productList").innerHTML=`<table><thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>${ps.map(p=>`<tr><td><b>${esc(p.name)}</b><br><span class="muted">${esc(p.category)} · ${esc(p.sku)}</span></td><td>${money(p.sale_price??p.price)}</td><td>${p.stock}${p.stock<=p.min_stock?' ⚠️':''}</td><td>${p.active?'Publicado':'Pausado'}</td><td class="actions"><button class="mini" onclick='editProduct(${JSON.stringify(p)})'>Editar</button><button class="mini danger" onclick="deleteProduct(${p.id})">Excluir</button></td></tr>`).join("")}</tbody></table>`
}
function newProduct(){editing=null;productModal({})}
function editProduct(p){editing=p;productModal(p)}
function productModal(p){
 $("modalTitle").textContent=p.id?"Editar produto":"Novo produto";
 $("modalBody").innerHTML=`<div class="form-grid">
 <label>Nome<input id="p_name" value="${escAttr(p.name||"")}"></label>
 <label>Categoria<input id="p_category" value="${escAttr(p.category||"")}"></label>
 <label>Marca<input id="p_brand" value="${escAttr(p.brand||"")}"></label>
 <label>SKU<input id="p_sku" value="${escAttr(p.sku||"")}"></label>
 <label>Preço<input id="p_price" type="number" step=".01" value="${p.price??""}"></label>
 <label>Preço promocional<input id="p_sale" type="number" step=".01" value="${p.sale_price??""}"></label>
 <label>Estoque<input id="p_stock" type="number" value="${p.stock??0}"></label>
 <label>Estoque mínimo<input id="p_min" type="number" value="${p.min_stock??0}"></label>
 <label class="full">URL da foto principal<input id="p_image" value="${escAttr(p.image||"")}" placeholder="ou faça upload abaixo"></label>
 <label class="full">URL do vídeo<input id="p_video" value="${escAttr(p.video||"")}" placeholder="opcional"></label>
 <label class="full">Descrição<textarea id="p_desc">${esc(p.description||"")}</textarea></label>
 <label class="full">Especificações<textarea id="p_specs">${esc(p.specs||"")}</textarea></label>
 <label>Publicado<select id="p_active"><option value="1" ${p.active!==0?'selected':''}>Sim</option><option value="0" ${p.active===0?'selected':''}>Não</option></select></label>
 <div class="upload"><b>Upload de mídia</b><input id="media" type="file" accept="image/*,video/mp4,video/webm,video/quicktime"><button onclick="uploadMedia()">Enviar arquivo</button><div id="uploadMsg" class="muted"></div></div>
 </div><button class="primary" onclick="saveProduct()">Salvar produto</button>`;
 $("modal").classList.remove("hidden");
}
async function uploadMedia(){
 const f=$("media").files[0];if(!f)return alert("Escolha um arquivo.");
 const fd=new FormData();fd.append("file",f);
 try{const d=await api("/api/admin/upload",{method:"POST",body:fd});if(d.type==="video")$("p_video").value=d.url;else $("p_image").value=d.url;$("uploadMsg").textContent="Arquivo enviado com sucesso."}catch(e){alert(e.message)}
}
async function saveProduct(){
 const p={name:$("p_name").value,category:$("p_category").value,brand:$("p_brand").value,sku:$("p_sku").value,price:$("p_price").value,sale_price:$("p_sale").value,stock:$("p_stock").value,min_stock:$("p_min").value,image:$("p_image").value,video:$("p_video").value,description:$("p_desc").value,specs:$("p_specs").value,active:$("p_active").value==="1"};
 try{await api(editing?"/api/admin/products/"+editing.id:"/api/admin/products",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});closeModal();loadProducts();loadDashboard()}catch(e){alert(e.message)}
}
async function deleteProduct(id){if(!confirm("Excluir este produto?"))return;await api("/api/admin/products/"+id,{method:"DELETE"});loadProducts();loadDashboard()}

async function loadBanners(){
 const bs=await api("/api/admin/banners");
 $("bannerList").innerHTML=`<table><thead><tr><th>Título</th><th>Mídia</th><th>Ordem</th><th>Ações</th></tr></thead><tbody>${bs.map(b=>`<tr><td><b>${esc(b.title)}</b><br><span class="muted">${esc(b.subtitle)}</span></td><td>${esc(b.media_type)}<br><small>${esc(b.media).slice(0,50)}</small></td><td>${b.sort_order}</td><td><button class="mini" onclick='editBanner(${JSON.stringify(b)})'>Editar</button><button class="mini danger" onclick="deleteBanner(${b.id})">Excluir</button></td></tr>`).join("")}</tbody></table>`
}
function newBanner(){editing=null;bannerModal({})} function editBanner(b){editing=b;bannerModal(b)}
function bannerModal(b){
 $("modalTitle").textContent=b.id?"Editar banner":"Novo banner";
 $("modalBody").innerHTML=`<div class="form-grid">
 <label>Título<input id="b_title" value="${escAttr(b.title||"")}"></label>
 <label>Subtítulo<input id="b_sub" value="${escAttr(b.subtitle||"")}"></label>
 <label>Texto do botão<input id="b_button" value="${escAttr(b.button_text||"Comprar agora")}"></label>
 <label>Link<input id="b_link" value="${escAttr(b.link||"#")}"></label>
 <label class="full">URL da imagem/vídeo<input id="b_media" value="${escAttr(b.media||"")}"></label>
 <label>Tipo<select id="b_type"><option value="image" ${b.media_type!=="video"?'selected':''}>Imagem</option><option value="video" ${b.media_type==="video"?'selected':''}>Vídeo</option></select></label>
 <label>Ordem<input id="b_order" type="number" value="${b.sort_order??0}"></label>
 <label>Ativo<select id="b_active"><option value="1" ${b.active!==0?'selected':''}>Sim</option><option value="0" ${b.active===0?'':'selected'}>Não</option></select></label>
 </div><button class="primary" onclick="saveBanner()">Salvar banner</button>`;
 $("modal").classList.remove("hidden");
}
async function saveBanner(){
 const b={title:$("b_title").value,subtitle:$("b_sub").value,button_text:$("b_button").value,link:$("b_link").value,media:$("b_media").value,media_type:$("b_type").value,sort_order:$("b_order").value,active:$("b_active").value==="1"};
 try{await api(editing?"/api/admin/banners/"+editing.id:"/api/admin/banners",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});closeModal();loadBanners()}catch(e){alert(e.message)}
}
async function deleteBanner(id){if(!confirm("Excluir este banner?"))return;await api("/api/admin/banners/"+id,{method:"DELETE"});loadBanners()}

async function loadOrders(){
 const os=await api("/api/admin/orders");
 $("orderList").innerHTML=`<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Status</th></tr></thead><tbody>${os.map(o=>`<tr><td>#${o.id}<br><span class="muted">${o.created_at}</span></td><td>${esc(o.customer_name)}<br>${esc(o.email)}</td><td>${money(o.total)}</td><td>${o.payment_method}</td><td><select onchange="setOrderStatus(${o.id},this.value)">${["Aguardando pagamento","Pagamento aprovado","Em preparação","Enviado","Entregue","Cancelado"].map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table>`
}
async function setOrderStatus(id,status){await api("/api/admin/orders/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})})}
function closeModal(){$("modal").classList.add("hidden")}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escAttr(s){return esc(s).replace(/`/g,"&#096;")}
init();
