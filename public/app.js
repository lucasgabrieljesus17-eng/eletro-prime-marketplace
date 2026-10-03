let products=[], banners=[], cart=JSON.parse(localStorage.getItem("ep_cart")||"[]"), currentBanner=0;

const money = v => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const $ = id => document.getElementById(id);

async function load(){
  const [p,b,c] = await Promise.all([
    fetch("/api/products").then(r=>r.json()),
    fetch("/api/banners").then(r=>r.json()),
    fetch("/api/categories").then(r=>r.json())
  ]);
  products=p; banners=b;
  renderCategories(c); renderProducts(products);
  renderHero(); renderCart();
}
function renderCategories(cats){
  const icons=["📱","💻","🎧","📺","🏠","🎮","⌚","🔌","🤖","📷"];
  $("categories").innerHTML=cats.map((c,i)=>`<div class="category" onclick="filterCategory(${JSON.stringify(c)})"><div class="icon">${icons[i%icons.length]}</div><small>${c}</small></div>`).join("");
}
function card(p){
  const price=p.sale_price ?? p.price;
  const discount = p.sale_price
  ? Math.round((1 - p.sale_price / p.price) * 100)
  : 0;
 return `<article class="product" onclick="location.href='/produto.html?id=${p.id}'">
    <div class="product-img">
      ${p.sale_price ? `<span class="offer-badge">🔥 OFERTA ${discount}% OFF</span>` : ''}
     <button class="heart" onclick="event.stopPropagation(); toggleFavorite(${p.id}, this)">♡</button>
      <img loading="lazy" src="${p.image||'https://placehold.co/700x500/111827/e0b85c?text=Eletro+Prime'}" alt="${escapeHtml(p.name)}">
    </div>
    <div class="product-info">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="rating">★★★★★ <span style="color:#8b93a4">4,9</span></div>
      ${p.sale_price ? `<div class="price-old">${money(p.price)}</div>`:''}
      <div class="price">${money(price)}</div>
      <div class="pix">${money(price*0.97)} no Pix</div>
    </div>
   <button onclick="event.stopPropagation(); addToCart(${p.id})">Adicionar ao carrinho</button>
  </article>`;
}
function renderProducts(list){
  $("featured").innerHTML=list.slice(0,4).map(card).join("");
  $("catalog").innerHTML=list.map(card).join("");
}
function renderHero(){
  if(!banners.length) return;

  const media = $("heroMedia");
  const b = banners[currentBanner];

  // Reinicia a animação 3D a cada troca de banner
  media.classList.remove("ep-3d-enter");
  void media.offsetWidth;
  media.classList.add("ep-3d-enter");

  media.style.backgroundImage = `url("${b.media}")`;

  $("heroDots").innerHTML = banners
    .map((_,i) =>
      `<span class="dot ${i === currentBanner ? "active" : ""}"></span>`
    )
    .join("");

  const copy = document.querySelector(".hero-copy");

  copy.querySelector("h1").innerHTML =
    `${escapeHtml(b.title)}<br>
     <em>${escapeHtml(b.subtitle || "TECNOLOGIA PARA O SEU LAR")}</em>`;

  copy.querySelector("p").textContent =
    "Produtos selecionados, ofertas e novidades na Eletro Prime.";

  copy.querySelector(".gold-btn").textContent =
    b.button_text + " →";

  copy.querySelector(".gold-btn").href =
    b.link || "#";
}
setInterval(()=>{if(banners.length){currentBanner=(currentBanner+1)%banners.length;renderHero()}},5000);

function addToCart(id, quantity = 1){
  const p = products.find(x => x.id === id);
  if(!p) return;

  quantity = Math.max(1, Number(quantity) || 1);

  const existing = cart.find(x => x.id === id);

  if(existing){
    existing.qty += quantity;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: p.sale_price ?? p.price,
      image: p.image,
      qty: quantity
    });
  }

  localStorage.setItem("ep_cart", JSON.stringify(cart));
  renderCart();
  openCart();
}
function renderCart(){
  $("cartCount").textContent=cart.reduce((a,b)=>a+b.qty,0);
  $("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><img src="${x.image}"><div><strong>${escapeHtml(x.name)}</strong><small>${x.qty} × ${money(x.price)}</small><div><button onclick="changeQty(${x.id},-1)">−</button> <button onclick="changeQty(${x.id},1)">+</button></div></div></div>`).join(""):"<p style='color:#aab2c2'>Seu carrinho está vazio.</p>";
  $("cartTotal").textContent=money(cart.reduce((a,b)=>a+b.price*b.qty,0));
}
function changeQty(id,d){
  const x=cart.find(a=>a.id===id); if(!x)return;
  x.qty+=d; if(x.qty<=0) cart=cart.filter(a=>a.id!==id);
  localStorage.setItem("ep_cart",JSON.stringify(cart)); renderCart();
}
function openCart(){$("drawer").classList.add("open");$("overlay").classList.add("show")}
function closeCart(){$("drawer").classList.remove("open");$("overlay").classList.remove("show")}
$("cartBtn").onclick=openCart;
async function checkout(){
  if(!cart.length)return alert("Adicione produtos ao carrinho.");
  const name=prompt("Nome completo:"); if(!name)return;
  const email=prompt("E-mail:"); if(!email)return;
  const method=prompt("Pagamento: digite PIX, CREDITO ou DEBITO").toLowerCase();
  const map={pix:"pix",credito:"credit",debito:"debit"};
  if(!map[method])return alert("Método inválido.");
  const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
const response = await fetch("/api/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    customer_name: name,
    email,
    total,
    payment_method: method,
    items: cart
  })
});

const data = await response.json();

if (!response.ok) {
  return alert(data.error || "Não foi possível criar o pedido.");
}

const mpResponse = await fetch("/api/mercadopago/preference", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    items: cart.map(item => ({
      id: item.id,
      title: item.name,
      quantity: item.qty,
      unit_price: item.price
    }))
  })
});

const mpData = await mpResponse.json();

if (!mpResponse.ok) {
  return alert(mpData.error || "Não foi possível iniciar o pagamento.");
}

localStorage.removeItem("ep_cart");
renderCart();
closeCart();

window.location.href = mpData.init_point;
}
function filterCategory(c){
  const list=products.filter(p=>p.category===c);
  $("catalog").innerHTML=list.map(card).join("");
  location.hash="produtos";
}
$("searchBtn").onclick=search;
$("search").addEventListener("keydown",e=>{if(e.key==="Enter")search()});
$("sort").onchange=async()=>{const s=$("sort").value;const list=await fetch("/api/products?sort="+s).then(r=>r.json());$("catalog").innerHTML=list.map(card).join("")};
async function search(){
  const q=encodeURIComponent($("search").value);
  const list=await fetch("/api/products?q="+q).then(r=>r.json());
  $("catalog").innerHTML=list.map(card).join("");
  location.hash="produtos";
}
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
load();
/* ===== EFEITO 3D COM MOVIMENTO DO MOUSE ===== */

const heroMedia = document.querySelector("#heroMedia");

if (heroMedia) {

  heroMedia.addEventListener("mousemove", (event) => {

    const rect = heroMedia.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const moveX = (x - centerX) / centerX;
    const moveY = (y - centerY) / centerY;

    heroMedia.style.transform = `
      scale(1.04)
      perspective(1000px)
      rotateY(${moveX * 2}deg)
      rotateX(${moveY * -2}deg)
      translateX(${moveX * 6}px)
      translateY(${moveY * 4}px)
    `;
  });

  heroMedia.addEventListener("mouseleave", () => {

    heroMedia.style.transform = `
      scale(1.02)
      perspective(1000px)
      rotateY(0deg)
      rotateX(0deg)
      translateX(0)
      translateY(0)
    `;

  });

}

async function toggleFavorite(productId, button) {

  try {

    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        product_id: productId
      })
    });

    const data = await response.json();

    if (response.status === 401) {

      alert("🔐 Entre na sua conta para salvar seus favoritos.");

      window.location.href = "/login.html";

      return;
    }

    if (!response.ok) {

      alert(data.error || "Não foi possível salvar o favorito.");

      return;
    }

    if (data.favorited) {

      button.textContent = "♥";
      button.classList.add("active");

    } else {

      button.textContent = "♡";
      button.classList.remove("active");

    }

  } catch (error) {

    console.error(error);

    alert("Não foi possível conectar ao servidor.");

  }

}

