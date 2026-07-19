import React, { useEffect, useState } from "react";

const labels={idle:"Обновления ещё не проверялись",checking:"Проверяем обновления…","config-required":"Обновления не настроены","up-to-date":"Установлена актуальная версия",available:"Доступна новая версия",downloading:"Загрузка обновления…",ready:"Обновление загружено",error:"Не удалось проверить обновления"};

export function UpdatePanel(){
  const api=window.dbToolsDesktop?.updates; const [status,setStatus]=useState({state:"idle"});
  useEffect(()=>{api?.status().then(setStatus)},[api]);
  if(!api) return <section className="update-card"><strong>Обновления desktop-приложения</strong><span>Доступны после запуска через Electron.</span></section>;
  async function check(){setStatus({state:"checking"});try{setStatus(await api.check())}catch(error){setStatus({state:"error",message:error.message})}}
  async function download(){setStatus({state:"downloading"});try{setStatus(await api.download())}catch(error){setStatus({state:"error",message:error.message})}}
  async function install(){try{await api.install()}catch(error){setStatus({state:"error",message:error.message})}}
  return <section className="update-card"><div><strong>Обновления</strong><span>{labels[status.state]??status.state}</span>{status.manifest&&<small>Версия {status.manifest.version} · {Math.ceil(status.manifest.asset.size/1048576)} МБ</small>}{status.message&&<small>{status.message}</small>}</div><div className="update-actions"><button onClick={check} disabled={status.state==="checking"||status.state==="downloading"}>Проверить</button>{status.state==="available"&&<button onClick={download}>Загрузить</button>}{status.state==="ready"&&<button onClick={install}>Установить и перезапустить</button>}</div></section>;
}
