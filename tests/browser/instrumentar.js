// Solo lo inyecta el servidor sintético; no forma parte de las páginas publicadas.
window.erroresQA=[];window.avisosQA=[];
window.addEventListener('error',e=>window.erroresQA.push(e.message));
window.addEventListener('unhandledrejection',e=>window.erroresQA.push(e.reason?.message||String(e.reason)));
// En una pestaña normal se conservan las confirmaciones y alertas originales.
// Solo el recorrido automático dentro de su iframe captura esos diálogos.
if(window.parent!==window) {
  let recorrido=false;
  try{recorrido=!!window.parent.document.getElementById('iniciar');}catch{}
  if(recorrido){window.alert=mensaje=>window.avisosQA.push(String(mensaje));window.confirm=()=>true;}
}
