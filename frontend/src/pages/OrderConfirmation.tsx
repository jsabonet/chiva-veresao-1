import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Copy, ExternalLink, Home, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';

type OrderStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export default function OrderConfirmation() {
  const { id } = useParams();
  const orderId = Number(id);
  
  // Guard: if route param is missing or not a valid number
  if (Number.isNaN(orderId)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Pedido Inválido</h1>
              <p className="text-sm text-gray-600 mb-6">
                O identificador do pedido é inválido ou não foi informado.
              </p>
              <Button asChild className="w-full">
                <Link to="/" className="flex items-center justify-center gap-2">
                  <Home className="h-4 w-4" />
                  Voltar à loja
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const { fetchPaymentStatus } = usePayments();
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const pollingRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const isFinal = status === 'paid' || status === 'failed' || status === 'cancelled';

  const { clearCart } = useCart();
  const clearedRef = useRef<boolean>(false);

  // When payment is confirmed (paid), clear the local frontend cart once.
  useEffect(() => {
    if (status === 'paid' && !clearedRef.current) {
      try {
        clearCart();
        clearedRef.current = true;
      } catch (e) {
        console.warn('Failed to clear local cart after payment confirmation', e);
      }
    }
  }, [status, clearCart]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetchPaymentStatus(orderId);
        if (cancelled) return;
        
        // Always update payments array (needed for checkout URL button)
        setPayments(res.payments || []);
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Check if order exists (may be null if not yet created after payment)
        if (!res.order) {
          console.log('⏳ Order not yet created, payment still processing...');
          const latestPayment = res.payments?.[0];
          if (latestPayment) {
            console.log('💳 Payment status:', latestPayment.status);
            // Use payment status when order doesn't exist yet
            const paymentStatus = latestPayment.status;
            if (paymentStatus === 'paid' || paymentStatus === 'failed' || paymentStatus === 'cancelled') {
              setStatus(paymentStatus as OrderStatus);
            } else {
              setStatus('pending');
            }
          }
          return;
        }
        
        // Priorizar payment.status sobre order.status
        // O webhook atualiza payment.status primeiro, depois order.status
        const latestPayment = res.payments?.[0];
        let effectiveStatus: OrderStatus = res.order.status;
        
        if (latestPayment) {
          console.log('💳 Latest Payment:', {
            id: latestPayment.id,
            status: latestPayment.status,
            method: latestPayment.method,
            paysuite_reference: latestPayment.paysuite_reference
          });
          
          // Se payment está paid/failed/cancelled, usar esse status
          // porque o webhook atualiza payment primeiro
          if (latestPayment.status === 'paid' || 
              latestPayment.status === 'failed' || 
              latestPayment.status === 'cancelled') {
            effectiveStatus = latestPayment.status as OrderStatus;
            console.log(`✅ Using payment.status: ${latestPayment.status} (order.status was: ${res.order.status})`);
          }
        }
        
        // Log detalhado para debug
        console.log('📊 Poll Response:', {
          order_id: res.order.id,
          order_status: res.order.status,
          payment_status: latestPayment?.status,
          effective_status: effectiveStatus,
          payments: res.payments.map((p: any) => ({ id: p.id, status: p.status, method: p.method })),
          timestamp: new Date().toLocaleTimeString()
        });
        
        setStatus(effectiveStatus);
      } catch (e: any) {
        if (cancelled) return;
        console.error('❌ Poll Error:', e);
        setError(e?.message || 'Falha ao consultar status do pagamento');
      }
    };

    // primeira consulta imediata
    poll();

    // polling a cada 3s até 2min ou estado final
    pollingRef.current = window.setInterval(async () => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed > 2 * 60 * 1000) {
        // Timeout: marca como failed após 2 minutos sem confirmação
        if (status === 'pending' || status === 'processing') {
          console.warn('⏰ TIMEOUT: 2 minutos sem confirmação - marcando como failed');
          setStatus('failed');
          setError('Tempo de confirmação excedido. Por favor, verifique o status do seu pagamento ou tente novamente.');
        }
        
        // para após 2 minutos
        if (pollingRef.current) window.clearInterval(pollingRef.current);
        pollingRef.current = null;
        return;
      }
      if (!isFinal) {
        await poll();
      }
    }, 3000);

    return () => {
      cancelled = true;
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, [orderId]);

  useEffect(() => {
    if (isFinal && pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isFinal]);

  const statusInfo = useMemo(() => {
    const lastPayment = payments[0];
    const isMobilePayment = lastPayment?.method === 'mpesa' || lastPayment?.method === 'emola';
    
    switch (status) {
      case 'paid':
        return { 
          icon: <CheckCircle2 className="h-8 w-8 text-green-600" />, 
          title: '✅ Pagamento Aprovado!', 
          desc: 'Seu pedido foi confirmado e está sendo processado. Você receberá um email com os detalhes e atualizações sobre o envio.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-900'
        };
      case 'failed':
        return { 
          icon: <XCircle className="h-8 w-8 text-red-600" />, 
          title: '❌ Pagamento Recusado', 
          desc: 'Não foi possível processar o pagamento. Seu carrinho foi mantido para você tentar novamente. Verifique os dados do pagamento ou escolha outro método.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-900'
        };
      case 'cancelled':
        return { 
          icon: <XCircle className="h-8 w-8 text-amber-600" />, 
          title: '⚠️ Pagamento Cancelado', 
          desc: 'O pagamento foi cancelado. Seu carrinho foi preservado — você pode voltar e tentar novamente quando desejar.',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          textColor: 'text-amber-900'
        };
      case 'processing':
      case 'pending':
      default:
        if (isMobilePayment) {
          const methodName = lastPayment?.method === 'mpesa' ? 'M-Pesa' : 'e-Mola';
          return { 
            icon: <Clock className="h-8 w-8 text-primary animate-pulse" />, 
            title: `⏳ Aguardando confirmação ${methodName}`, 
            desc: `Complete o pagamento no checkout externo. Depois de finalizar, volte a esta página — o status será atualizado automaticamente a cada 3 segundos.`,
            bgColor: 'bg-primary/10',
            borderColor: 'border-primary/30',
            textColor: 'text-blue-900'
          };
        }
        return { 
          icon: <Clock className="h-8 w-8 text-primary animate-pulse" />, 
          title: '⏳ Aguardando confirmação', 
          desc: 'Estamos confirmando seu pagamento com a operadora. Isso pode levar alguns instantes. Por favor, aguarde.',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/30',
          textColor: 'text-blue-900'
        };
    }
  }, [status, payments]);

  const lastPayment = payments[0];

  const hasExternalCheckout = !!lastPayment?.raw_response?.data?.checkout_url;

  const openExternalCheckout = () => {
    const url = lastPayment?.raw_response?.data?.checkout_url;
    if (!url) return;
    try {
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      // fallback
      window.location.href = url;
    }
  };

  const copyExternalLink = async () => {
    const url = lastPayment?.raw_response?.data?.checkout_url;
    if (!url) return window.alert('Link de checkout não disponível');
    try {
      await navigator.clipboard.writeText(url);
      window.alert('Link copiado para a área de transferência');
    } catch (e) {
      // fallback
      window.prompt('Copie o link abaixo:', url);
    }
  };

  // Get error message for failed payments
  const getErrorMessage = () => {
    if (!lastPayment?.raw_response) return 'Não foi possível processar o pagamento.';
    return (
      lastPayment.raw_response?.polled_response?.message ||
      lastPayment.raw_response?.polled_response?.data?.message ||
      lastPayment.raw_response?.message ||
      lastPayment.raw_response?.data?.error ||
      lastPayment.raw_response?.data?.message ||
      'Não foi possível processar o pagamento. Tente novamente.'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-6 sm:py-12">
        <div className="max-w-lg mx-auto">
          
          {/* Status Icon & Header - Minimalista e mobile-first */}
          <div className="text-center mb-6 sm:mb-8 animate-in fade-in duration-500">
            <div className={`
              w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full 
              flex items-center justify-center shadow-lg
              ${status === 'paid' ? 'bg-gradient-to-br from-green-400 to-green-600' : ''}
              ${status === 'failed' ? 'bg-gradient-to-br from-red-400 to-red-600' : ''}
              ${status === 'cancelled' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : ''}
              ${(status === 'pending' || status === 'processing') ? 'bg-gradient-to-br from-primary to-primary-hover' : ''}
              transition-all duration-300
            `}>
              {status === 'paid' && <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-white" />}
              {status === 'failed' && <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />}
              {status === 'cancelled' && <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-white" />}
              {(status === 'pending' || status === 'processing') && (
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-white animate-pulse" />
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {statusInfo.title}
            </h1>
            
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Pedido #{orderId}
            </p>
          </div>

          {/* Main Card - Design limpo e responsivo */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Description */}
            <div className="p-6 sm:p-8">
              <p className="text-sm sm:text-base text-gray-700 text-center leading-relaxed">
                {statusInfo.desc}
              </p>
            </div>

            {/* Error Details - Para pagamentos falhados */}
            {status === 'failed' && lastPayment && (
              <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-900 mb-1">Detalhes do erro:</p>
                      <p className="text-sm text-red-700 break-words">{getErrorMessage()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details - Informações técnicas */}
            <div className="px-6 pb-6 sm:px-8 sm:pb-8 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className={`font-semibold ${
                    status === 'paid' ? 'text-green-600' :
                    status === 'failed' ? 'text-red-600' :
                    status === 'cancelled' ? 'text-amber-600' :
                    'text-primary'
                  }`}>
                    {status === 'paid' ? 'Pago' :
                     status === 'failed' ? 'Falhou' :
                     status === 'cancelled' ? 'Cancelado' :
                     'Pendente'}
                  </p>
                </div>
                
                {lastPayment && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Método</p>
                    <p className="font-semibold text-gray-900 uppercase">{lastPayment.method}</p>
                  </div>
                )}
              </div>

              {lastPayment?.paysuite_reference && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Referência</p>
                  <p className="font-mono text-xs text-gray-700 break-all">
                    {lastPayment.paysuite_reference}
                  </p>
                </div>
              )}

              {!isFinal && (
                <div className="flex items-center justify-center gap-2 text-xs text-primary bg-primary/10 rounded-lg p-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Atualizando a cada 3 segundos</span>
                </div>
              )}
            </div>

            {/* Action Buttons - Mobile-first */}
            <div className="px-6 pb-6 sm:px-8 sm:pb-8">
              <div className="space-y-3">
                {/* Checkout Externo (pending/processing) */}
                {hasExternalCheckout && !isFinal && (
                  <>
                    <Button 
                      onClick={openExternalCheckout}
                      className="w-full h-12 text-base font-semibold gap-2"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Finalizar Pagamento
                    </Button>
                    <Button 
                      onClick={copyExternalLink}
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar Link
                    </Button>
                  </>
                )}

                {/* Ações para Failed */}
                {status === 'failed' && (
                  <>
                    {hasExternalCheckout && (
                      <Button 
                        onClick={openExternalCheckout}
                        className="w-full h-12 text-base font-semibold gap-2"
                      >
                        <ExternalLink className="h-5 w-5" />
                        Tentar Novamente
                      </Button>
                    )}
                    <Button 
                      asChild
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                    >
                      <Link to="/carrinho">
                        <ShoppingCart className="h-4 w-4" />
                        Voltar ao Carrinho
                      </Link>
                    </Button>
                  </>
                )}

                {/* Ações para Paid */}
                {status === 'paid' && (
                  <>
                    <Button 
                      asChild
                      className="w-full h-12 text-base font-semibold gap-2"
                    >
                      <Link to="/account/orders">
                        <Package className="h-5 w-5" />
                        Ver Meus Pedidos
                      </Link>
                    </Button>
                    <Button 
                      asChild
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                    >
                      <Link to="/">
                        <Home className="h-4 w-4" />
                        Continuar Comprando
                      </Link>
                    </Button>
                  </>
                )}

                {/* Ações para Cancelled */}
                {status === 'cancelled' && (
                  <>
                    <Button 
                      asChild
                      className="w-full h-12 text-base font-semibold gap-2"
                    >
                      <Link to="/carrinho">
                        <ShoppingCart className="h-5 w-5" />
                        Voltar ao Carrinho
                      </Link>
                    </Button>
                    <Button 
                      asChild
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                    >
                      <Link to="/">
                        <Home className="h-4 w-4" />
                        Continuar Comprando
                      </Link>
                    </Button>
                  </>
                )}

                {/* Default para sem checkout externo */}
                {!hasExternalCheckout && !isFinal && (
                  <>
                    <Button 
                      asChild
                      variant="outline"
                      className="w-full h-12 text-base gap-2"
                    >
                      <Link to="/">
                        <Home className="h-4 w-4" />
                        Voltar à Loja
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Success Tips - Apenas para pagamentos bem-sucedidos */}
          {status === 'paid' && (
            <div className="bg-green-50 rounded-xl p-4 sm:p-6 space-y-3 animate-in slide-in-from-bottom-8 duration-700">
              <h3 className="font-semibold text-green-900 flex items-center gap-2 text-sm sm:text-base">
                <CheckCircle2 className="h-5 w-5" />
                Próximos Passos
              </h3>
              <ul className="text-xs sm:text-sm text-green-800 space-y-2 pl-7">
                <li className="relative before:content-['✓'] before:absolute before:-left-5 before:text-green-600 before:font-bold">
                  Email de confirmação enviado
                </li>
                <li className="relative before:content-['✓'] before:absolute before:-left-5 before:text-green-600 before:font-bold">
                  Acompanhe o envio na sua área de pedidos
                </li>
                <li className="relative before:content-['✓'] before:absolute before:-left-5 before:text-green-600 before:font-bold">
                  Prazo de entrega informado por email
                </li>
              </ul>
            </div>
          )}

          {/* Failure Tips - Apenas para pagamentos falhados/cancelados */}
          {(status === 'failed' || status === 'cancelled') && (
            <div className="bg-amber-50 rounded-xl p-4 sm:p-6 space-y-3 animate-in slide-in-from-bottom-8 duration-700">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2 text-sm sm:text-base">
                <AlertCircle className="h-5 w-5" />
                O que fazer agora
              </h3>
              <ul className="text-xs sm:text-sm text-amber-800 space-y-2 pl-7">
                <li className="relative before:content-['•'] before:absolute before:-left-5 before:text-amber-600 before:font-bold">
                  Seu carrinho foi preservado
                </li>
                <li className="relative before:content-['•'] before:absolute before:-left-5 before:text-amber-600 before:font-bold">
                  Verifique saldo na sua carteira
                </li>
                <li className="relative before:content-['•'] before:absolute before:-left-5 before:text-amber-600 before:font-bold">
                  Tente outro método de pagamento
                </li>
              </ul>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>Erro ao consultar status: {error}</span>
            </div>
          )}

          {/* Last Update Time */}
          {lastUpdate && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Última atualização: {lastUpdate}
            </p>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
