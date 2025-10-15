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
        setStatus(res.order.status);
        setPayments(res.payments || []);
        setLastUpdate(new Date().toLocaleTimeString());
      } catch (e: any) {
        if (cancelled) return;
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
        return { icon: <CheckCircle2 className="h-6 w-6 text-green-600" />, title: 'Pagamento confirmado', desc: 'Seu pedido foi pago com sucesso. Obrigado!' };
      case 'failed':
        return { icon: <XCircle className="h-6 w-6 text-red-600" />, title: 'Pagamento falhou', desc: 'Não foi possível processar o pagamento. Tente novamente.' };
      case 'cancelled':
        return { icon: <XCircle className="h-6 w-6 text-amber-600" />, title: 'Pagamento cancelado', desc: 'O pagamento foi cancelado.' };
      case 'processing':
      case 'pending':
      default:
        if (isMobilePayment) {
          const methodName = lastPayment?.method === 'mpesa' ? 'M-Pesa' : 'Emola';
          return { 
            icon: <Clock className="h-6 w-6 text-blue-600 animate-pulse" />, 
            title: `Aguardando confirmação ${methodName}`, 
            desc: `📱 Clique em "Finalizar no Checkout" abaixo para abrir o link. Depois de concluir, volte a esta página para verificar o status do pedido — a atualização é automática` 
          };
        }
        return { icon: <Clock className="h-6 w-6 text-blue-600 animate-pulse" />, title: 'Aguardando confirmação', desc: 'Estamos confirmando seu pagamento. Isso pode levar alguns instantes.' };
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
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              {statusInfo.icon}
              <div>
                <CardTitle>{statusInfo.title}</CardTitle>
                <p className="text-sm text-muted-foreground">Pedido #{orderId}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{statusInfo.desc}</p>

              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}

              <Separator />

              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium">Última atualização: </span>
                  <span>{lastUpdate || '—'}</span>
                </div>
                {lastPayment && (
                  <div className="text-xs text-muted-foreground">
                    Referência: {lastPayment.paysuite_reference || '—'} | Status: {lastPayment.status}
                  </div>
                )}
              </div>

              {!isFinal && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RotateCw className="h-4 w-4 animate-spin" /> Atualizando automaticamente
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
