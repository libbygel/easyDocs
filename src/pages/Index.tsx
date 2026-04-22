import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      navigate(user ? "/cases" : "/login");
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center animate-pulse text-muted-foreground">טוען...</div>
    </div>
  );
};

export default Index;
