export type Product = {
  id: string; name: string; subtitle: string; category: string; age: string;
  minAge: number; price: number; image: string; color: string; badge?: string;
  description: string; details: string[];
};
export const products: Product[] = [
  { id:"rainbow", name:"Rainbow Stacker", subtitle:"A little color. A lot of possibilities.", category:"Build & create", age:"3+ years", minAge:3, price:2900, image:"/images/rainbow.webp", color:"#fff1e5", badge:"Playroom pick", description:"Stack a rainbow, build a bridge, or invent a tiny tunnel. Six colorful wooden arches turn everyday play into something wonderfully open-ended.", details:["6 nesting wooden arches", "Painted wood with visible natural grain", "Open-ended stacking and building play", "Adult supervision recommended"] },
  { id:"bear", name:"The Hug Club Bear", subtitle:"Their new, take-everywhere best friend.", category:"Soft & cuddly", age:"0+ years", minAge:0, price:2400, image:"/images/bear.webp", color:"#fcebef", badge:"Cuddle favorite", description:"For imaginary tea parties, bedtime stories, and everything in between. This caramel-colored companion brings a little extra comfort to every adventure.", details:["Soft plush fill throughout", "Embroidered sage green scarf (sewn on)", "Approximately 12 inches tall", "Sized for little hands from birth"] },
  { id:"rocket", name:"Little Space Explorer", subtitle:"Next stop: wherever imagination goes.", category:"Imagine & play", age:"3+ years", minAge:3, price:3400, image:"/images/rocket.webp", color:"#eaf3f9", badge:"New adventure", description:"Countdown to a whole new world of make-believe. A wooden rocket and its little astronaut are ready for moon missions, planet hopping, and a safe landing on the living-room rug.", details:["Wooden rocket and astronaut figure", "Coral nose and teal fins", "Perfect for imaginative storytelling", "Small parts; not for children under 3"] },
  { id:"jeep", name:"Safari Road Trip", subtitle:"Big adventures for little explorers.", category:"Imagine & play", age:"3+ years", minAge:3, price:3200, image:"/images/jeep.webp", color:"#fff6dc", description:"Take the scenic route! A sunshine-yellow jeep and its curious giraffe passenger bring endless safari stories to playtime.", details:["Wooden jeep and giraffe figure", "Rolling rubber wheels", "Easy-to-hold chunky design", "Small parts; not for children under 3"] },
  { id:"blocks", name:"Little Builder Blocks", subtitle:"Dream it. Stack it. Start again.", category:"Build & create", age:"3+ years", minAge:3, price:3900, image:"/images/blocks.webp", color:"#f1edf9", badge:"So many ways to play", description:"A city today, a castle tomorrow. A colorful collection of wooden shapes puts the next big idea right into little hands.", details:["24 assorted wooden blocks", "Arches, cubes, roofs, and cylinders", "Mix of natural wood and cheerful colors", "Small parts; not for children under 3"] },
  { id:"dinos", name:"Pocket Dino Pals", subtitle:"Little friends from a very big world.", category:"Imagine & play", age:"3+ years", minAge:3, price:2700, image:"/images/dinos.webp", color:"#e9f3eb", description:"Meet a friendly prehistoric trio with a talent for turning any afternoon into an expedition. Three colorful dinosaurs, endless stories to tell.", details:["3 dinosaur figures", "Brontosaurus, triceratops, and stegosaurus", "Chunky matte finish", "Small parts; not for children under 3"] },
];
export type Bundle = { id:string; name:string; tagline:string; items:string[]; price:number; color:string; label:string };
export const bundles: Bundle[] = [
  { id:"bundle-build", name:"The Little Makers", tagline:"For the ones who see a castle in every block.", items:["rainbow","blocks"], price:5400, color:"#eaf0e7", label:"BUILD A WORLD" },
  { id:"bundle-explore", name:"Adventure Awaits", tagline:"One small step. A whole lot of imagination.", items:["rocket","jeep"], price:5200, color:"#f7e8de", label:"GO SOMEWHERE NEW" },
  { id:"bundle-friends", name:"The Best Friend Club", tagline:"Double the company. Double the happy.", items:["bear","dinos"], price:3900, color:"#ede9f6", label:"MEET YOUR NEW CREW" },
];
export const money = (cents:number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD",maximumFractionDigits:cents%100===0?0:2}).format(cents/100);
export function getItem(sku:string) {
  const product = products.find(p=>p.id===sku);
  if (product) return { ...product, originalPrice:product.price, bundle:false };
  const bundle = bundles.find(b=>b.id===sku);
  if (!bundle) return null;
  return { ...bundle, image:products.find(p=>p.id===bundle.items[0])!.image, originalPrice:bundle.items.reduce((sum,id)=>sum+products.find(p=>p.id===id)!.price,0), bundle:true };
}
export type CartLine = {sku:string;quantity:number};
export function calculateCart(lines:CartLine[]) {
  let subtotal=0, savings=0;
  for (const line of lines) {
    const item=getItem(line.sku);
    if (!item || !Number.isInteger(line.quantity) || line.quantity<1 || line.quantity>10) throw new Error("Invalid cart item.");
    subtotal+=item.price*line.quantity;
    savings+=(item.originalPrice-item.price)*line.quantity;
  }
  const shipping=subtotal===0||subtotal>=6000?0:495;
  return {subtotal,savings,shipping,total:subtotal+shipping,count:lines.reduce((s,l)=>s+l.quantity,0)};
}
