import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Instagram, Twitter, Linkedin, Music2, Globe, Loader2, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  websiteUrl: z.string().url({ message: "Please enter a valid URL" }).min(1, "Website URL is required"),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  tiktok: z.string().optional(),
  industry: z.string().optional(),
  market: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const BrandDiagnosticForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-diagnostic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          brandName: data.brandName,
          websiteUrl: data.websiteUrl,
          instagram: data.instagram || null,
          x: data.twitter || null,
          linkedin: data.linkedin || null,
          tiktok: data.tiktok || null,
          industry: data.industry || null,
          market: data.market || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("Diagnostic started:", responseData);
      
      if (responseData.input_id) {
        toast.success("Analysis started! Redirecting to results...");
        navigate(`/result?input_id=${responseData.input_id}`);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto backdrop-blur-xl bg-white/70 border border-white/20 shadow-[var(--shadow-glass)] animate-slide-up transition-all duration-300 hover:shadow-[var(--shadow-medium)]">
      <form onSubmit={handleSubmit(onSubmit)} className={`space-y-8 p-8 md:p-12 transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {/* Brand Name - Required */}
        <div className="space-y-3">
          <Label htmlFor="brandName" className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            Brand Name
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="brandName"
            type="text"
            placeholder="e.g., &quot;Nike&quot;, &quot;Zara&quot;, &quot;Adidas&quot;"
            className={`h-14 text-lg border-2 transition-all duration-300 ${errors.brandName ? 'border-destructive' : 'border-border focus:border-primary'}`}
            {...register("brandName")}
          />
          {errors.brandName && (
            <p className="text-sm text-destructive">{errors.brandName.message}</p>
          )}
        </div>

        {/* Website URL - Required */}
        <div className="space-y-3">
          <Label htmlFor="websiteUrl" className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Globe className="w-5 h-5 text-primary" />
            Brand Website URL
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://www.example.com"
            className={`h-14 text-lg border-2 transition-all duration-300 ${errors.websiteUrl ? 'border-destructive' : 'border-border focus:border-primary'}`}
            {...register("websiteUrl")}
          />
          {errors.websiteUrl && (
            <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
          )}
        </div>

        {/* Social Links Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Social Media Handles</h3>
          <p className="text-sm text-muted-foreground">All fields are optional</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2 text-foreground">
                <Instagram className="w-4 h-4 text-primary" />
                Instagram
              </Label>
              <Input
                id="instagram"
                placeholder="@yourbrand"
                className="h-12 border-2 border-border focus:border-primary transition-all duration-300"
                {...register("instagram")}
              />
            </div>

            {/* Twitter/X */}
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2 text-foreground">
                <Twitter className="w-4 h-4 text-primary" />
                X / Twitter
              </Label>
              <Input
                id="twitter"
                placeholder="@yourbrand"
                className="h-12 border-2 border-border focus:border-primary transition-all duration-300"
                {...register("twitter")}
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2 text-foreground">
                <Linkedin className="w-4 h-4 text-primary" />
                LinkedIn
              </Label>
              <Input
                id="linkedin"
                placeholder="company/yourbrand"
                className="h-12 border-2 border-border focus:border-primary transition-all duration-300"
                {...register("linkedin")}
              />
            </div>

            {/* TikTok */}
            <div className="space-y-2">
              <Label htmlFor="tiktok" className="flex items-center gap-2 text-foreground">
                <Music2 className="w-4 h-4 text-primary" />
                TikTok
              </Label>
              <Input
                id="tiktok"
                placeholder="@yourbrand"
                className="h-12 border-2 border-border focus:border-primary transition-all duration-300"
                {...register("tiktok")}
              />
            </div>
          </div>
        </div>

        {/* Industry & Market Text Inputs */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-base font-semibold text-foreground">
              Industry
            </Label>
            <Input
              id="industry"
              placeholder="e.g., Fashion, Tech, Food & Beverage"
              className="h-12 border-2 border-border focus:border-primary transition-all duration-300"
              {...register("industry")}
            />
          </div>

          {/* Market */}
          <div className="space-y-2">
            <Label htmlFor="market" className="text-base font-semibold text-foreground">
              Market / Country
            </Label>
            <Input
              id="market"
              placeholder="e.g., USA, Europe, Worldwide"
              className="h-12 border-2 border-border focus:border-primary transition-all duration-300"
              {...register("market")}
            />
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 hover:scale-[1.02] shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Rocket className="w-6 h-6 mr-2" />
                Run Brand Diagnostic
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default BrandDiagnosticForm;
