
import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import QRCode from 'qrcode';
import { Wifi, ArrowLeftRight, Smartphone, Loader2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SyncPacket } from '../../types';

type SyncState = 'idle' | 'hosting' | 'joining' | 'connecting' | 'syncing' | 'completed' | 'error';

const SyncTab: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [hostId, setHostId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  useEffect(() => {
      return () => {
          // Cleanup on unmount
          if (connRef.current) connRef.current.close();
          if (peerRef.current) peerRef.current.destroy();
      };
  }, []);

  const initializePeer = (): Promise<string> => {
      return new Promise((resolve, reject) => {
          const peer = new Peer();
          peer.on('open', (id) => {
              console.log('My peer ID is: ' + id);
              peerRef.current = peer;
              resolve(id);
          });
          peer.on('error', (err) => {
              console.error('PeerJS Error:', err);
              setSyncState('error');
              setStatusMsg('Erro na conexão P2P: ' + err.type);
              reject(err);
          });
      });
  };

  // --- HOST Logic ---
  const startHosting = async () => {
      setSyncState('hosting');
      setStatusMsg('Inicializando rede...');
      try {
          const id = await initializePeer();
          setHostId(id);
          
          // Generate QR Code for easy connection
          const qrUrl = await QRCode.toDataURL(id, { margin: 2, color: { dark: '#065f46', light: '#ffffff' } });
          setQrCodeUrl(qrUrl);
          setStatusMsg('Aguardando outro dispositivo conectar...');

          peerRef.current?.on('connection', (conn) => {
              connRef.current = conn;
              setSyncState('connecting');
              setStatusMsg('Dispositivo encontrado! Conectando...');
              setupConnectionHandlers(conn, true);
          });

      } catch (e) {
          setSyncState('error');
      }
  };

  // --- JOIN Logic ---
  const joinHost = async () => {
      if (!targetId.trim()) return;
      setSyncState('joining');
      setStatusMsg('Conectando ao dispositivo anfitrião...');
      try {
           await initializePeer();
           if (peerRef.current) {
               const conn = peerRef.current.connect(targetId.trim(), { reliable: true });
               connRef.current = conn;
               setupConnectionHandlers(conn, false);
           }
      } catch (e) {
          setSyncState('error');
      }
  };

  // --- Common Connection & Sync Logic ---
  const setupConnectionHandlers = (conn: DataConnection, isHost: boolean) => {
      conn.on('open', async () => {
          setSyncState('syncing');
          setStatusMsg('Conectado! Iniciando troca de dados...');
          
          // Initial handshake: if I joined, I send my data first to start the cycle.
          if (!isHost) {
              sendSyncData(conn);
          }
      });

      conn.on('data', async (data: any) => {
          if (data && data.type === 'SYNC_DATA') {
              setStatusMsg('Recebendo dados do outro dispositivo...');
              await handleReceiveData(data.payload);
              
              if (isHost) {
                  // Host received data, merged it. Now send FULL merged data back.
                  setStatusMsg('Enviando base de dados consolidada...');
                  await sendSyncData(conn, 'SYNC_DATA_FINAL');
              }
          } else if (data && data.type === 'SYNC_DATA_FINAL') {
               // Joiner received final data. Merge and finish.
               setStatusMsg('Finalizando sincronização...');
               await handleReceiveData(data.payload);
               conn.send({ type: 'SYNC_COMPLETE' });
               finishSync();
          } else if (data && data.type === 'SYNC_COMPLETE') {
              finishSync();
          }
      });

      conn.on('close', () => {
          if (syncState !== 'completed') {
               // Only show error if it closed unexpectedly before completion
              // setSyncState('error');
              // setStatusMsg('Conexão encerrada.');
          }
      });
      
      conn.on('error', (err) => {
          console.error("Connection error:", err);
          setSyncState('error');
          setStatusMsg('Erro durante a transferência.');
      });
  };

  const sendSyncData = async (conn: DataConnection, type: string = 'SYNC_DATA') => {
      try {
          const dataToSync = await StorageService.getSyncData();
          conn.send({
              type: type,
              payload: dataToSync
          });
      } catch (e) {
          console.error("Error sending data:", e);
          setSyncState('error');
          setStatusMsg('Falha ao ler dados locais.');
      }
  };

  const handleReceiveData = async (payload: SyncPacket) => {
      try {
          await StorageService.mergeSyncData(payload);
      } catch (e) {
           console.error("Error merging data:", e);
           setSyncState('error');
           setStatusMsg('Falha ao salvar dados recebidos.');
      }
  };

  const finishSync = () => {
      setSyncState('completed');
      setStatusMsg('Sincronização realizada com sucesso!');
      setTimeout(() => {
          if (connRef.current) connRef.current.close();
          if (peerRef.current) peerRef.current.destroy();
          peerRef.current = null;
          connRef.current = null;
      }, 1000);
  };

  const reset = () => {
      if (connRef.current) connRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
      peerRef.current = null;
      connRef.current = null;
      setSyncState('idle');
      setHostId('');
      setTargetId('');
      setQrCodeUrl('');
      setStatusMsg('');
  };
  
  const copyToClipboard = () => {
      navigator.clipboard.writeText(hostId);
      alert("ID copiado para a área de transferência!");
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto flex flex-col h-full">
       <div className="text-center mb-8">
           <div className="bg-emerald-100 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
               <ArrowLeftRight size={32} className="text-emerald-700" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800">Sincronizar Dispositivos</h2>
           <p className="text-gray-600 mt-2 text-sm">
               Mantenha seus dados atualizados entre múltiplos aparelhos.
               Ambos os dispositivos devem estar conectados preferencialmente à mesma rede Wi-Fi para melhor desempenho.
           </p>
       </div>

       <div className="flex-1 flex flex-col items-center justify-start gap-6">
           
           {syncState === 'idle' && (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                   <button onClick={startHosting} className="flex flex-col items-center p-6 bg-white border-2 border-emerald-100 hover:border-emerald-500 rounded-xl shadow-sm transition-all group">
                       <div className="bg-emerald-50 p-4 rounded-full mb-4 group-hover:bg-emerald-100 transition-colors">
                           <Wifi size={32} className="text-emerald-600" />
                       </div>
                       <h3 className="font-bold text-lg text-gray-800">Este é o Anfitrião</h3>
                       <p className="text-xs text-gray-500 text-center mt-2">Gere um código para outro dispositivo se conectar a este.</p>
                   </button>

                   <button onClick={() => setSyncState('joining')} className="flex flex-col items-center p-6 bg-white border-2 border-blue-100 hover:border-blue-500 rounded-xl shadow-sm transition-all group">
                       <div className="bg-blue-50 p-4 rounded-full mb-4 group-hover:bg-blue-100 transition-colors">
                           <Smartphone size={32} className="text-blue-600" />
                       </div>
                       <h3 className="font-bold text-lg text-gray-800">Conectar a outro</h3>
                       <p className="text-xs text-gray-500 text-center mt-2">Insira o código de um dispositivo anfitrião para receber/enviar dados.</p>
                   </button>
               </div>
           )}

           {syncState === 'hosting' && (
               <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 w-full max-w-sm text-center animate-fadeIn">
                   <h3 className="font-bold text-gray-800 mb-4">Aguardando Conexão...</h3>
                   
                   {qrCodeUrl ? (
                       <div className="flex flex-col items-center">
                           <img src={qrCodeUrl} alt="QR Code para Sincronização" className="w-48 h-48 border-4 border-white shadow-sm rounded-lg mb-4" />
                           <p className="text-sm text-gray-500 mb-2">Peça para o outro dispositivo escanear ou digite o ID abaixo:</p>
                           <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md w-full max-w-[280px]">
                               <code className="text-xs text-gray-700 break-all flex-1 text-left max-h-12 overflow-y-auto">{hostId}</code>
                               <button onClick={copyToClipboard} className="text-gray-500 hover:text-emerald-600 p-1"><Copy size={16} /></button>
                           </div>
                       </div>
                   ) : (
                       <div className="flex flex-col items-center py-8">
                           <Loader2 size={40} className="animate-spin text-emerald-600 mb-4" />
                           <p className="text-gray-600">{statusMsg}</p>
                       </div>
                   )}
                   
                   <button onClick={reset} className="mt-6 text-red-600 hover:text-red-700 text-sm font-medium">Cancelar</button>
               </div>
           )}

           {syncState === 'joining' && (
               <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 w-full max-w-sm animate-fadeIn">
                   <h3 className="font-bold text-gray-800 mb-4 text-center">Conectar ao Anfitrião</h3>
                   <div className="mb-4">
                       <label className="block text-sm font-medium text-gray-700 mb-1">ID do Dispositivo Anfitrião</label>
                       <textarea 
                           value={targetId}
                           onChange={e => setTargetId(e.target.value)}
                           placeholder="Cole o ID longo aqui..."
                           className="w-full border border-gray-300 rounded-md p-2 text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                       />
                   </div>
                   <button 
                       onClick={joinHost} 
                       disabled={!targetId.trim()}
                       className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 rounded-md font-medium transition-colors flex justify-center items-center gap-2"
                   >
                       Conectar e Sincronizar
                   </button>
                   <button onClick={reset} className="w-full mt-3 text-gray-500 hover:text-gray-700 text-sm">Voltar</button>
               </div>
           )}

           {(syncState === 'connecting' || syncState === 'syncing') && (
                <div className="flex flex-col items-center justify-center py-12 animate-fadeIn">
                    <div className="relative">
                        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-20"></div>
                        <div className="bg-white p-6 rounded-full shadow-md relative z-10">
                             <Loader2 size={48} className="animate-spin text-emerald-600" />
                        </div>
                    </div>
                    <h3 className="mt-8 text-xl font-semibold text-gray-800">Sincronizando...</h3>
                    <p className="text-gray-500 mt-2">{statusMsg}</p>
                    <p className="text-xs text-amber-600 mt-4 bg-amber-50 px-3 py-1 rounded-full">Não feche esta tela até concluir.</p>
                </div>
           )}

           {syncState === 'completed' && (
               <div className="flex flex-col items-center justify-center py-8 animate-fadeIn">
                   <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
                   <h3 className="text-2xl font-bold text-gray-800">Sucesso!</h3>
                   <p className="text-gray-600 mt-2 mb-8">{statusMsg}</p>
                   <button onClick={reset} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md font-medium">
                       Concluir
                   </button>
               </div>
           )}

           {syncState === 'error' && (
               <div className="flex flex-col items-center justify-center py-8 animate-fadeIn">
                   <AlertCircle size={64} className="text-red-500 mb-4" />
                   <h3 className="text-xl font-bold text-gray-800">Algo deu errado</h3>
                   <p className="text-red-600 mt-2 mb-8 text-center px-4">{statusMsg}</p>
                   <button onClick={reset} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-md font-medium">
                       Tentar Novamente
                   </button>
               </div>
           )}

       </div>
    </div>
  );
};

export default SyncTab;