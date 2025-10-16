import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, Clock, RotateCw } from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';

type OrderStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export default function OrderConfirmation() {
  const { id } = useParams();
  const orderId = Number(id);
  // Guard: if route param is missing or not a valid number, avoid calling the API with NaN
  if (Number.isNaN(orderId)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Pedido inválido</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">O identificador do pedido é inválido ou não foi informado. Verifique o link ou retorne à loja.</p>
                <div className="mt-4">
                  <Button asChild>
                    <Link to="/">Voltar à loja</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
        
        // Log detalhado para debug
        console.log('📊 Poll Response:', {
          order_id: res.order.id,
          order_status: res.order.status,
          payments: res.payments.map((p: any) => ({ id: p.id, status: p.status, method: p.method })),
          timestamp: new Date().toLocaleTimeString()
        });
        
        setStatus(res.order.status);
        setPayments(res.payments || []);
        setLastUpdate(new Date().toLocaleTimeString());
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
            icon: <Clock className="h-8 w-8 text-blue-600 animate-pulse" />, 
            title: `⏳ Aguardando confirmação ${methodName}`, 
            desc: `Complete o pagamento no checkout externo. Depois de finalizar, volte a esta página — o status será atualizado automaticamente a cada 3 segundos.`,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-900'
          };
        }
        return { 
          icon: <Clock className="h-8 w-8 text-blue-600 animate-pulse" />, 
          title: '⏳ Aguardando confirmação', 
          desc: 'Estamos confirmando seu pagamento com a operadora. Isso pode levar alguns instantes. Por favor, aguarde.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className={`${statusInfo.borderColor} border-2`}>
            <CardHeader className={`${statusInfo.bgColor} flex flex-row items-center gap-3`}>
              {statusInfo.icon}
              <div className="flex-1">
                <CardTitle className={statusInfo.textColor}>{statusInfo.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Pedido #{orderId}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className={`p-4 rounded-lg ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
                <p className={`${statusInfo.textColor} font-medium`}>{statusInfo.desc}</p>
              </div>

              {/* Success details - only show when paid */}
              {status === 'paid' && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-900">✓ Próximos Passos:</h3>
                  <ul className="text-sm text-green-800 space-y-2 ml-4 list-disc">
                    <li>Você receberá um email de confirmação com os detalhes do pedido</li>
                    <li>Acompanhe o status do envio na sua área de pedidos</li>
                    <li>O prazo de entrega será informado por email</li>
                    <li>Em caso de dúvidas, entre em contato com nosso suporte</li>
                  </ul>
                </div>
              )}

              {/* Failure guidance - show when failed or cancelled */}
              {(status === 'failed' || status === 'cancelled') && (
                <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h3 className="font-semibold text-amber-900">💡 O que fazer agora:</h3>
                  <ul className="text-sm text-amber-800 space-y-2 ml-4 list-disc">
                    <li>Seu carrinho foi preservado e continua disponível</li>
                    <li>Verifique se há saldo suficiente na sua carteira</li>
                    <li>Tente outro método de pagamento (M-Pesa, e-Mola, Cartão)</li>
                    <li>Se o problema persistir, contate seu provedor de pagamento</li>
                  </ul>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  ⚠️ Erro ao consultar status: {error}
                </div>
              )}

              <Separator />

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última atualização:</span>
                  <span className="font-medium">{lastUpdate || '—'}</span>
                </div>
                {lastPayment && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referência do pagamento:</span>
                      <span className="font-mono text-xs">{lastPayment.paysuite_reference || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status do pagamento:</span>
                      <span className={`font-medium ${
                        lastPayment.status === 'paid' ? 'text-green-600' :
                        lastPayment.status === 'failed' ? 'text-red-600' :
                        lastPayment.status === 'cancelled' ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        {lastPayment.status === 'paid' ? 'Pago' :
                         lastPayment.status === 'failed' ? 'Falhou' :
                         lastPayment.status === 'cancelled' ? 'Cancelado' :
                         lastPayment.status === 'pending' ? 'Pendente' : lastPayment.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Método:</span>
                      <span className="font-medium uppercase">{lastPayment.method}</span>
                    </div>
                  </>
                )}
              </div>

              {!isFinal && (
                <div className="flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <RotateCw className="h-4 w-4 animate-spin" /> 
                  <span>Atualizando automaticamente a cada 3 segundos...</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {/* External checkout still pending: show external actions */}
                {hasExternalCheckout && !isFinal ? (
                  <>
                    <Button onClick={openExternalCheckout}>
                      Finalizar no Checkout
                    </Button>
                    <Button variant="outline" onClick={copyExternalLink}>
                      Copiar link
                    </Button>
                  </>
                ) : isFinal ? (
                  /* Final state: show appropriate final CTAs */
                  status === 'paid' ? (
                    <>
                      <Button asChild>
                        <Link to="/account/orders">Ver pedido</Link>
                      </Button>
                      <Button asChild variant="secondary">
                        <Link to="/">Continuar comprando</Link>
                      </Button>
                    </>
                  ) : (
                    /* failed or cancelled */
                    <>
                      <Button asChild>
                        <Link to="/carrinho">Voltar ao carrinho</Link>
                      </Button>
                      <Button asChild variant="secondary">
                        <Link to="/">Voltar à loja</Link>
                      </Button>
                    </>
                  )
                ) : (
                  /* Default while no external checkout: previous behavior */
                  <>
                    <Button asChild variant="secondary">
                      <Link to="/">Voltar à loja</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/carrinho">Tentar novamente</Link>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
