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

  if(!cart.length){
    alert("Adicione produtos ao carrinho.");
    return;
  }

  const customer = await new Promise(resolve => {

    const style = document.createElement("style");
    style.id = "ep-checkout-style";

    if(!document.getElementById("ep-checkout-style")){
      style.textContent = `
        .ep-modal-overlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.65);
          backdrop-filter:blur(5px);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:99999;
          padding:20px;
        }

        .ep-modal{
          width:100%;
          max-width:480px;
          background:#fff;
          border-radius:18px;
          box-shadow:0 25px 80px rgba(0,0,0,.35);
          overflow:hidden;
          animation:epModal .2s ease;
        }

        @keyframes epModal{
          from{
            opacity:0;
            transform:translateY(15px) scale(.98);
          }
          to{
            opacity:1;
            transform:translateY(0) scale(1);
          }
        }

        .ep-modal-header{
          background:linear-gradient(135deg,#111,#252525);
          color:#fff;
          padding:24px 26px;
        }

        .ep-modal-header h2{
          margin:0 0 6px;
          font-size:23px;
        }

        .ep-modal-header p{
          margin:0;
          color:#bbb;
          font-size:14px;
        }

        .ep-modal-body{
          padding:25px 26px 26px;
        }

        .ep-field{
          margin-bottom:17px;
        }

        .ep-field label{
          display:block;
          font-size:13px;
          font-weight:600;
          color:#333;
          margin-bottom:7px;
        }

        .ep-field input,
        .ep-field select{
          width:100%;
          box-sizing:border-box;
          padding:13px 14px;
          border:1px solid #ddd;
          border-radius:10px;
          font-size:15px;
          outline:none;
          transition:.2s;
          background:#fff;
        }

        .ep-field input:focus,
        .ep-field select:focus{
          border-color:#d99b00;
          box-shadow:0 0 0 3px rgba(217,155,0,.12);
        }

        .ep-payment{
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:8px;
        }

        .ep-payment label{
          border:1px solid #ddd;
          border-radius:10px;
          padding:11px 7px;
          text-align:center;
          cursor:pointer;
          font-size:12px;
          transition:.2s;
        }

        .ep-payment input{
          display:none;
        }

        .ep-payment label:has(input:checked){
          border-color:#d99b00;
          background:#fff8e5;
          color:#9b6c00;
          font-weight:700;
        }

        .ep-actions{
          display:flex;
          gap:10px;
          margin-top:22px;
        }

        .ep-btn{
          flex:1;
          border:0;
          border-radius:10px;
          padding:14px;
          font-size:15px;
          font-weight:700;
          cursor:pointer;
        }

        .ep-btn-cancel{
          background:#f1f1f1;
          color:#333;
        }

        .ep-btn-pay{
          background:#d99b00;
          color:#111;
        }

        .ep-btn-pay:hover{
          background:#c58d00;
        }

        .ep-secure{
          text-align:center;
          margin-top:15px;
          font-size:12px;
          color:#777;
        }

        @media(max-width:500px){
          .ep-payment{
            grid-template-columns:1fr;
          }
        }
      `;

      document.head.appendChild(style);
    }

    const overlay = document.createElement("div");
    overlay.className = "ep-modal-overlay";

    overlay.innerHTML = `
      <div class="ep-modal">

        <div class="ep-modal-header">
          <h2>Finalizar compra</h2>
          <p>Preencha seus dados para continuar com segurança.</p>
        </div>

        <div class="ep-modal-body">

          <div class="ep-field">
            <label>Nome completo</label>
            <input
              id="epCustomerName"
              type="text"
              placeholder="Digite seu nome completo"
              autocomplete="name"
            >
          </div>

          <div class="ep-field">
            <label>E-mail</label>
            <input
              id="epCustomerEmail"
              type="email"
              placeholder="seuemail@email.com"
              autocomplete="email"
            >
          </div>

          <div class="ep-field">
            <label>Forma de pagamento</label>

            <div class="ep-payment">

              <label>
                <input type="radio" name="epPayment" value="pix" checked>
                PIX
              </label>

              <label>
                <input type="radio" name="epPayment" value="credit">
                Cartão de crédito
              </label>

              <label>
                <input type="radio" name="epPayment" value="debit">
                Cartão de débito
              </label>

            </div>
          </div>

          <div class="ep-actions">

            <button
              type="button"
              class="ep-btn ep-btn-cancel"
              id="epCancel"
            >
              Voltar
            </button>

            <button
              type="button"
              class="ep-btn ep-btn-pay"
              id="epContinue"
            >
              Continuar para pagamento
            </button>

          </div>

          <div class="ep-secure">
            🔒 Você será direcionado ao Mercado Pago para concluir o pagamento.
          </div>

        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    const nameInput = overlay.querySelector("#epCustomerName");
    const emailInput = overlay.querySelector("#epCustomerEmail");

    nameInput.focus();

    overlay.querySelector("#epCancel").onclick = () => {
      overlay.remove();
      resolve(null);
    };

    overlay.querySelector("#epContinue").onclick = () => {

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const methodInput = overlay.querySelector(
        'input[name="epPayment"]:checked'
      );

      if(!name){
        alert("Digite seu nome completo.");
        nameInput.focus();
        return;
      }

      if(!email){
        alert("Digite seu e-mail.");
        emailInput.focus();
        return;
      }

      if(!email.includes("@")){
        alert("Digite um e-mail válido.");
        emailInput.focus();
        return;
      }

      const method = methodInput
        ? methodInput.value
        : "pix";

      overlay.remove();

      resolve({
        name,
        email,
        method
      });
    };

    overlay.addEventListener("click", e => {
      if(e.target === overlay){
        overlay.remove();
        resolve(null);
      }
    });

  });

  if(!customer) return;

  const name = customer.name;
  const email = customer.email;
  const method = customer.method;

  const map = {
    pix: "pix",
    credit: "credit",
    debito: "debit"
  };

  if(!map[method]){
    alert("Método inválido.");
    return;
  }

  const total = cart.reduce(
    (a,b) => a + b.price * b.qty,
    0
  );

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      customer_name: name,
      email,
      total,
      payment_method: map[method],
      items: cart
    })
  });

  const data = await response.json();

  if(!response.ok){
    return alert(
      data.error || "Não foi possível criar o pedido."
    );
  }

  const mpResponse = await fetch(
    "/api/mercadopago/preference",
    {
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
    }
  );

  const mpData = await mpResponse.json();

  if(!mpResponse.ok){
    return alert(
      mpData.error || "Não foi possível iniciar o pagamento."
    );
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

