import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="flex flex-col items-center justify-center min-h-screen p-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <Search className="mx-auto h-16 w-16 text-muted-foreground opacity-50" />
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Page not found</h1>
          <p className="text-muted-foreground">
            We couldn't find the page you're looking for.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={() => navigate('/')} variant="default">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </motion.div>
  );
}