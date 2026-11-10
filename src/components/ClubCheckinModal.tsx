import React, { useState, useEffect, useRef } from 'react';
import { Camera, MapPin, CheckCircle2, AlertTriangle, X, RefreshCw, Clock, ShieldCheck, ChevronRight, User, Loader2, Sparkles, Navigation, ScanFace } from 'lucide-react';
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

  // Estados de escaneamento e contagem de 3 segundos
  const [isScanning, setIsScanning] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(3);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);
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
        setGpsError('');

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
        console.warn('Geolocation high accuracy error, trying standard accuracy fallback:', err);
        // Fallback para precisão normal se GPS de alta precisão demorar ou falhar
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setCoords({ latitude, longitude, accuracy });
            setGpsStatus('ready');
            setGpsError('');

            if (club?.latitude != null && club?.longitude != null) {
              const dist = calculateDistance(latitude, longitude, Number(club.latitude), Number(club.longitude));
              setDistanceMeters(dist);
              const maxRadius = club.checkinRadiusMeters || 500;
              setIsWithinRadius(dist <= maxRadius);
            } else {
              setDistanceMeters(null);
              setIsWithinRadius(true);
            }
          },
          (secondErr) => {
            console.warn('Geolocation fallback error:', secondErr);
            setGpsStatus('error');
            if (secondErr.code === secondErr.PERMISSION_DENIED || err.code === err.PERMISSION_DENIED) {
              setGpsError('Permissão de GPS negada. É obrigatório autorizar a localização nas permissões do navegador para que o check-in tenha validade junto ao Exército.');
            } else if (secondErr.code === secondErr.TIMEOUT || err.code === err.TIMEOUT) {
              setGpsError('Tempo esgotado ao buscar GPS. Verifique se a localização do aparelho está ativada.');
            } else {
              setGpsError('Não foi possível obter o sinal de geolocalização. O GPS é obrigatório para comprovação perante o Exército.');
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000,
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

  // Capture Photo com Estampa de Auditoria / Exército (GPS, Data, Hora, Atleta)
  const handleCapture = (): string | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Crop center square
    const startX = ((video.videoWidth || size) - size) / 2;
    const startY = ((video.videoHeight || size) - size) / 2;

    ctx.save();
    // Espelha horizontalmente para coincidir com a visualização da câmera
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    ctx.restore();

    // Faixa inferior de auditoria biométrica (Exército / SFPC)
    const barHeight = Math.round(size * 0.18);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, size - barHeight, size, barHeight);

    // Linha de realce verde esmeralda
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, size - barHeight, size, Math.max(2, Math.round(size * 0.007)));

    // Linha 1: Nome do Estande / Clube Oficial
    const clubDisplayName = club?.name || club?.fantasyName || 'Clube de Tiro';
    ctx.fillStyle = '#38bdf8';
    ctx.font = `bold ${Math.max(10, Math.round(size * 0.025))}px sans-serif`;
    ctx.fillText(`Estande/Clube: ${clubDisplayName}`, 10, size - barHeight + Math.round(barHeight * 0.28));

    // Linha 2: Atleta e CPF
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10.5, Math.round(size * 0.026))}px sans-serif`;
    const athleteLabel = `${currentUser?.fullName || 'Atleta'} • CPF: ${currentUser?.cpf || '—'}`;
    ctx.fillText(athleteLabel, 10, size - barHeight + Math.round(barHeight * 0.58));

    // Linha 3: Data, Hora e Coordenadas GPS Exatas
    ctx.fillStyle = '#a7f3d0';
    ctx.font = `${Math.max(9.5, Math.round(size * 0.022))}px monospace`;
    const nowStr = new Date().toLocaleString('pt-BR');
    const coordsStr = coords?.latitude != null && coords?.longitude != null
      ? `GPS: ${Number(coords.latitude).toFixed(5)}, ${Number(coords.longitude).toFixed(5)} (±${coords.accuracy ? Math.round(coords.accuracy) : 0}m)`
      : 'GPS: Registrado no sistema';
    ctx.fillText(`${nowStr} | ${coordsStr}`, 10, size - barHeight + Math.round(barHeight * 0.86));

    // Compress to 480x480 jpeg
    const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
    setCapturedPhoto(dataUrl);
    stopCamera();
    return dataUrl;
  };

  const handleRetake = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    setIsScanning(false);
    setScanCountdown(3);
    setCapturedPhoto(null);
    setSubmitError('');
    startCamera();
  };

  // Envio do Checkin
  const submitCheckinWithPhoto = async (photoToSend: string) => {
    if (!coords || coords.latitude == null || coords.longitude == null) {
      setSubmitError('Para ter validade junto ao Exército Brasileiro é obrigatório carregar a geolocalização. Não é possível concluir o check-in sem o sinal de GPS.');
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy ?? null,
        photo: photoToSend,
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

  const handleSubmitCheckin = async () => {
    if (!coords || coords.latitude == null || coords.longitude == null) {
      setSubmitError('A geolocalização é obrigatória para validade do check-in junto ao Exército Brasileiro.');
      return;
    }
    if (!capturedPhoto) {
      setSubmitError('Por favor, realize o reconhecimento facial antes de confirmar.');
      return;
    }
    await submitCheckinWithPhoto(capturedPhoto);
  };

  // Iniciar sequência de 3 segundos para reconhecimento facial
  const startFacialRecognition = () => {
    if (!coords || coords.latitude == null || coords.longitude == null || gpsStatus !== 'ready') {
      setSubmitError('Para ter validade junto ao Exército Brasileiro, é obrigatório obter a geolocalização (GPS) antes de iniciar o reconhecimento facial.');
      return;
    }
    if (!cameraActive || isScanning || submitting) return;
    setIsScanning(true);
    setScanCountdown(3);
    setSubmitError('');

    let currentSec = 3;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      currentSec -= 1;
      if (currentSec > 0) {
        setScanCountdown(currentSec);
      } else {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setIsScanning(false);
        const photo = handleCapture();
        if (photo) {
          submitCheckinWithPhoto(photo);
        }
      }
    }, 1000);
  };

  const clubDisplayName = club?.name || club?.fantasyName || 'Clube de Tiro';

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
                    <span className="text-slate-500 font-medium">Nome do estande/Clube:</span>
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
                {/* 1. Geolocation Status Pill (Obrigatório para o Exército Brasileiro) */}
                <div className={`border rounded-xl p-3 flex items-start gap-2.5 transition ${
                  gpsStatus === 'ready'
                    ? 'bg-slate-50 border-slate-200'
                    : gpsStatus === 'locating'
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    gpsStatus === 'ready'
                      ? 'bg-emerald-100 text-emerald-700'
                      : gpsStatus === 'locating'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                        Geolocalização no Estande
                        <span className="text-[9px] font-normal text-slate-500 hidden sm:inline">(Exigência Exército)</span>
                      </span>
                      {gpsStatus === 'ready' && (
                        <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          GPS Ativo (±{Math.round(coords?.accuracy || 0)}m)
                        </span>
                      )}
                      {gpsStatus === 'locating' && (
                        <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                          <Loader2 className="w-3 h-3 animate-spin" /> Buscando GPS...
                        </span>
                      )}
                      {gpsStatus === 'error' && (
                        <span className="text-[10px] text-red-700 font-semibold bg-red-100/70 px-2 py-0.5 rounded-full border border-red-200">
                          GPS Não Detectado
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
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        Coordenadas: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-800 mt-0.5 font-medium">
                        O sinal de satélite é obrigatório. Aguarde a captura para liberar o check-in.
                      </p>
                    )}

                    {gpsError && (
                      <div className="mt-1.5 p-2 bg-white/90 rounded-lg border border-red-200 text-[11px] text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="leading-tight">⚠️ {gpsError}</span>
                        <button
                          type="button"
                          onClick={requestLocation}
                          className="text-blue-700 hover:text-blue-900 underline font-bold cursor-pointer text-[10px] shrink-0"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Camera Viewfinder with Facial Oval Guide & 3s Animation */}
                <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-square max-w-[340px] mx-auto border-2 border-slate-700 shadow-inner flex items-center justify-center">
                  <style>{`
                    @keyframes scanlineAnim {
                      0% { top: 12%; opacity: 0.3; }
                      50% { top: 82%; opacity: 1; }
                      100% { top: 12%; opacity: 0.3; }
                    }
                    .biometric-scanner-line {
                      animation: scanlineAnim 1.4s ease-in-out infinite;
                    }
                  `}</style>

                  {!capturedPhoto ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />

                      {/* Oval Face Frame Overlay com Animação de 3 Segundos */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                        <div
                          className={`w-48 h-64 rounded-[50%] transition-all duration-300 relative flex items-center justify-center ${
                            isScanning
                              ? 'border-4 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.9),0_0_0_9999px_rgba(15,23,42,0.65)] ring-4 ring-emerald-300/60 ring-offset-2 ring-offset-slate-950'
                              : 'border-2 border-dashed border-emerald-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] animate-pulse'
                          }`}
                        >
                          {/* Marcadores de cantos biométricos (Brackets de mira) */}
                          <div className={`absolute -top-3 -left-3 w-6 h-6 border-t-3 border-l-3 transition-colors ${isScanning ? 'border-emerald-300 scale-110' : 'border-emerald-400/70'}`} />
                          <div className={`absolute -top-3 -right-3 w-6 h-6 border-t-3 border-r-3 transition-colors ${isScanning ? 'border-emerald-300 scale-110' : 'border-emerald-400/70'}`} />
                          <div className={`absolute -bottom-3 -left-3 w-6 h-6 border-b-3 border-l-3 transition-colors ${isScanning ? 'border-emerald-300 scale-110' : 'border-emerald-400/70'}`} />
                          <div className={`absolute -bottom-3 -right-3 w-6 h-6 border-b-3 border-r-3 transition-colors ${isScanning ? 'border-emerald-300 scale-110' : 'border-emerald-400/70'}`} />

                          {/* Efeitos durante os 3 segundos de escaneamento */}
                          {isScanning && (
                            <>
                              {/* Linha laser de escaneamento vertical */}
                              <div className="absolute w-40 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_15px_#10b981] biometric-scanner-line" />

                              {/* Radar pulsante */}
                              <div className="absolute inset-4 rounded-[50%] border border-emerald-300/40 animate-ping" />

                              {/* Contador regressivo centralizado */}
                              <div className="w-16 h-16 rounded-full bg-slate-950/85 border-2 border-emerald-400 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md">
                                <span className="text-2xl font-black text-emerald-400 font-mono leading-none animate-bounce">
                                  {scanCountdown}
                                </span>
                                <span className="text-[8px] font-bold text-emerald-300 uppercase tracking-wider mt-0.5">
                                  seg
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Legenda Informativa */}
                        <div className="absolute bottom-3 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md text-emerald-300 text-[10.5px] font-semibold px-3 py-1.5 rounded-full border border-emerald-500/40 shadow-lg">
                          {isScanning ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>Aguardando posicionamento correto da cabeça... ({scanCountdown}s)</span>
                            </>
                          ) : (
                            <>
                              <ScanFace className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Centralize seu rosto na moldura</span>
                            </>
                          )}
                        </div>
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
                    gpsStatus === 'error' ? (
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        Ativar GPS Obrigatório para Iniciar
                      </button>
                    ) : gpsStatus === 'locating' ? (
                      <button
                        type="button"
                        disabled
                        className="w-full bg-slate-200 text-slate-500 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-300"
                      >
                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                        Obtendo geolocalização GPS (obrigatório para o Exército)...
                      </button>
                    ) : (
                      <button
                        onClick={startFacialRecognition}
                        disabled={!cameraActive || isScanning || submitting || gpsStatus !== 'ready' || !coords}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Escaneando posicionamento facial... ({scanCountdown}s)
                          </>
                        ) : submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Validando Reconhecimento Facial...
                          </>
                        ) : (
                          <>
                            <ScanFace className="w-4 h-4" />
                            Iniciar reconhecimento facial
                          </>
                        )}
                      </button>
                    )
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
                        disabled={submitting || gpsStatus !== 'ready' || !coords}
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
                            {chk.clubName || clubDisplayName}
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
