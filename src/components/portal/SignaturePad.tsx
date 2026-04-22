import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Check, Loader2, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSign: (signatureDataUrl: string) => Promise<void>;
  disabled?: boolean;
}

export function SignaturePad({ onSign, disabled }: SignaturePadProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signing, setSigning] = useState(false);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    setIsEmpty(sigRef.current?.isEmpty() ?? true);
  };

  const handleConfirm = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    
    setSigning(true);
    try {
      const dataUrl = sigRef.current.toDataURL('image/png');
      await onSign(dataUrl);
    } finally {
      setSigning(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PenTool className="h-5 w-5 text-primary" />
          חתום כאן
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background overflow-hidden">
          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{
              className: 'w-full h-48 touch-none',
              style: { width: '100%', height: '192px' }
            }}
            onEnd={handleEnd}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          חתום באמצעות עכבר או מגע
        </p>
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isEmpty || signing || disabled}
            className="gap-2"
          >
            <Eraser className="h-4 w-4" />
            נקה
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isEmpty || signing || disabled}
            className="gap-2"
          >
            {signing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            אשר חתימה
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
