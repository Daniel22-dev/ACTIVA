'use strict';
const search=document.querySelector('#manualSearch'),nodes=[...document.querySelectorAll('.searchable,.activity')],no=document.querySelector('#noResults');
function filter(){const q=search.value.trim().toLocaleLowerCase('cs');let shown=0;for(const node of nodes){const hit=!q||node.textContent.toLocaleLowerCase('cs').includes(q);node.classList.toggle('hidden-search',!hit);if(hit)shown++}no.classList.toggle('show',!!q&&!shown)}
search?.addEventListener('input',filter);
const links=[...document.querySelectorAll('.side a')];
const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id))}},{rootMargin:'-20% 0px -72%'});
document.querySelectorAll('.section[id]').forEach(x=>observer.observe(x));
