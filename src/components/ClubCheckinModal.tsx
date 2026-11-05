import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle2, AlertTriangle, X, RefreshCw, Clock, ShieldCheck, ChevronRight, User, Loader2, Sparkles, Navigation } from 'lucide-react';
import { User as UserType, Club, ClubCheckin } from '../types';

interface ClubCheckinModalProps {
  currentUser: UserType | null;
  club?: Club | null;
  onClose: () => void;
  onCheckinSuccess?: (checkin: ClubCheckin) => void;
}

export default function ClubCheckinModal({
  currentUser,
  club,
  onClose,
  onCheckinSuccess,
}: ClubCheckinModalProps) {
  const [activeTab, setActiveTab] = useState<'checkin' | 'history'>('checkin');

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string>('');

  // Camera State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [successCheckin, setSuccessCheckin] = useState<ClubCheckin | null>(null);

  // History State
  const [history, setHistory] = useState<ClubCheckin[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Haversine helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // 1. Initialize Geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    setGpsStatus('locating');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCoords({ latitude, longitude, accuracy });
        setGpsStatus('ready');

        if (club?.latitude != null && club?.longitude != null) {
          const dist = calculateDistance(latitude, longitude, Number(club.latitude), Number(club.longitude));
          setDistanceMeters(dist);
          const maxRadius = club.checkinRadiusMeters || 500;
          setIsWithinRadius(dist <= maxRadius);
        } else {
          setDistanceMeters(null);
          setIsWithinRadius(true); // Sem ponto configurado ainda, não bloqueia
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Permissão de GPS negada. Por favor, autorize a localização nas permissões do navegador.');
        } else {
          setGpsError('Não foi possível obter a localização exata do GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // 2. Initialize Camera
  const startCamera = async () => {
    setCameraError('');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permissão de câmera negada. Autorize o acesso à câmera no navegador.');
      } else {
        setCameraError('Não foi possível iniciar a câmera frontal: ' + (err.message || 'Erro de dispositivo'));
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (activeTab === 'checkin' && !successCheckin) {
      requestLocation();
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, successCheckin]);

  // Load History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/checkins/me', {
        headers: {
          'x-user-id': currentUser?.id || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.checkins || []);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  // Capture Photo
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const startX = ((video.videoWidth || size) - size) / 2;
    const startY = ((video.videoHeight || size) - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    // Compress to 480x480 jpeg
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setSubmitError('');
    startCamera();
  };

  // Submit Checkin
  const handleSubmitCheckin = async () => {
    if (!capturedPhoto) {
      setSubmitError('Por favor, tire uma selfie antes de confirmar o check-in.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        accuracy: coords?.accuracy ?? null,
        photo: capturedPhoto,
        clubId: club?.id || currentUser?.clubId,
      };

      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao registrar check-in.');
      }

      setSuccessCheckin(data.checkin);
      if (onCheckinSuccess) {
        onCheckinSuccess(data.checkin);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao processar validação do check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  const clubDisplayName = club?.fantasyName || club?.name || 'Clube de Tiro';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white px-5 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Check-in no Clube</h2>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                <MapPin className="w-3 h-3 inline" /> {clubDisplayName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center cursor-pointer text-white"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checkin'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Realizar Check-in
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Meu Histórico
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-slate-800 text-xs">
          {activeTab === 'checkin' ? (
            successCheckin ? (
              /* Success Screen */
              <div className="py-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Check-in Confirmado!</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Sua presença no clube foi registrada com sucesso.</p>
                </div>

                {/* Checkin Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2 text-[11px]">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Atleta:</span>
                    <span className="font-bold text-slate-800">{currentUser?.fullName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Clube:</span>
                    <span className="font-bold text-emerald-800">{successCheckin.clubName || clubDisplayName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Data e Hora:</span>
                    <span className="font-mono text-slate-700">
                      {new Date(successCheckin.checkinAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 font-medium">Localização GPS:</span>
                    <span className="font-semibold text-emerald-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {successCheckin.distanceToClubMeters != null
                        ? `${successCheckin.distanceToClubMeters}m do estande`
                        : 'Coordenadas registradas'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">Biometria Facial:</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                      {successCheckin.facialMatchScore != null
                        ? `Validada (${Math.round(successCheckin.facialMatchScore)}%)`
                        : 'Registrada'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      setSuccessCheckin(null);
                      setCapturedPhoto(null);
                      setActiveTab('history');
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition cursor-pointer"
                  >
                    Ver Histórico
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              /* Capture Screen */
              <div className="space-y-3.5">
                {/* 1. Geolocation Status Pill */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px]">Geolocalização no Estande</span>
                      {gpsStatus === 'ready' && (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          GPS Ativo (±{Math.round(coords?.accuracy || 0)}m)
                        </span>
                      )}
                      {gpsStatus === 'locating' && (
                        <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Buscando sinal...
                        </span>
                      )}
                    </div>

                    {distanceMeters != null ? (
                      <p
                        className={`text-[11px] mt-1 font-semibold ${
                          isWithinRadius ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isWithinRadius
                          ? `✅ Você está a ${distanceMeters} metros do estande (dentro da área).`
                          : `⚠️ Você está a ${distanceMeters} metros do clube (raio padrão: ${club?.checkinRadiusMeters || 500}m).`}
                      </p>
                    ) : coords ? (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Coordenadas capturadas: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                      </p>
                    ) : null}

                    {gpsError && (
                      <div className="mt-1 text-[11px] text-red-600 flex items-center justify-between">
                        <span>{gpsError}</span>
                        <button
                          onClick={requestLocation}
                          className="text-emerald-700 underline font-bold cursor-pointer text-[10px] ml-1"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Camera Viewfinder with Facial Oval Guide */}
                <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-square max-w-[340px] mx-auto border-2 border-slate-700 shadow-inner flex items-center justify-center">
                  {!capturedPhoto ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />

                      {/* Oval Face Frame Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                        <div className="w-48 h-64 border-2 border-dashed border-emerald-400/80 rounded-[50%] shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] animate-pulse" />
                        <span className="absolute bottom-3 bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30">
                          Centralize seu rosto na moldura
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full">
                      <img
                        src={capturedPhoto}
                        alt="Selfie Check-in"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-emerald-600/90 backdrop-blur text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        Foto Capturada
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/90 p-4 text-center text-white flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                      <p className="text-xs text-slate-300 max-w-[240px]">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Ativar Câmera
                      </button>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Error Banner */}
                {submitError && (
                  <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-[11px] font-semibold border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1">
                  {!capturedPhoto ? (
                    <button
                      onClick={handleCapture}
                      disabled={!cameraActive}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Tirar Foto e Validar
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleRetake}
                        disabled={submitting}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Tirar Outra
                      </button>
                      <button
                        onClick={handleSubmitCheckin}
                        disabled={submitting}
                        className="flex-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Validando Biometria...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Confirmar Check-in
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                  O check-in registra sua geolocalização e autenticação facial para comprovação de presença no clube de tiro.
                </p>
              </div>
            )
          ) : (
            /* History Tab */
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700 text-xs">Histórico Recente de Presenças</span>
                <button
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Carregando check-ins...</span>
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-medium">Nenhum check-in registrado ainda.</p>
                  <p className="text-[10px] text-slate-400">Faça seu primeiro check-in quando estiver no clube.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {history.map((chk) => (
                    <div
                      key={chk.id}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {chk.photoData ? (
                          <img
                            src={chk.photoData}
                            alt="Selfie"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">
                            {chk.clubName || 'Clube de Tiro'}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(chk.checkinAt).toLocaleString('pt-BR')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {chk.distanceToClubMeters != null ? (
                              <span className="text-[9px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                                📍 {chk.distanceToClubMeters}m
                              </span>
                            ) : null}
                            {chk.facialMatchScore != null && (
                              <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                                Biometria: {Math.round(chk.facialMatchScore)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            chk.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {chk.status === 'confirmed' ? 'Confirmado' : 'Em Análise'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
