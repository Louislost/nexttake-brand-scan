import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Instagram, Twitter, Linkedin, Music2, Globe, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
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
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // Send data to n8n webhook
      const response = await fetch("https://<YOUR-N8N-DOMAIN>/webhook/brand-diagnostic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_website_url: data.websiteUrl,
          instagram: data.instagram || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("n8n webhook response:", responseData);
      
      toast.success("Analysis complete! Processing your brand data.");
      
      // Redirect to results page with input_id from n8n response
      if (responseData.input_id) {
        navigate(`/results?input_id=${responseData.input_id}`);
      } else {
        throw new Error("No input_id received from n8n");
      }
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to process brand scan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-3xl mx-auto p-12 animate-fade-in">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Analyzing your brand's digital footprint...</h3>
            <p className="text-muted-foreground text-lg">
              Collecting signals across 50+ public sources
            </p>
          </div>
          <div className="w-full max-w-md bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent animate-shimmer"
              style={{
                backgroundSize: '200% 100%',
              }}
            ></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto p-8 md:p-12 shadow-[var(--shadow-medium)] animate-slide-up">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Website URL - Required */}
        <div className="space-y-3">
          <Label htmlFor="websiteUrl" className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Brand Website URL
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://www.example.com"
            className={`h-14 text-lg ${errors.websiteUrl ? 'border-destructive' : 'focus:border-primary'}`}
            {...register("websiteUrl")}
          />
          {errors.websiteUrl && (
            <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>
          )}
        </div>

        {/* Social Links Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Social Media Handles</h3>
          <p className="text-sm text-muted-foreground">All fields are optional</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-primary" />
                Instagram
              </Label>
              <Input
                id="instagram"
                placeholder="@yourbrand"
                className="h-12"
                {...register("instagram")}
              />
            </div>

            {/* Twitter/X */}
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="w-4 h-4 text-primary" />
                X / Twitter
              </Label>
              <Input
                id="twitter"
                placeholder="@yourbrand"
                className="h-12"
                {...register("twitter")}
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-primary" />
                LinkedIn
              </Label>
              <Input
                id="linkedin"
                placeholder="company/yourbrand"
                className="h-12"
                {...register("linkedin")}
              />
            </div>

            {/* TikTok */}
            <div className="space-y-2">
              <Label htmlFor="tiktok" className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-primary" />
                TikTok
              </Label>
              <Input
                id="tiktok"
                placeholder="@yourbrand"
                className="h-12"
                {...register("tiktok")}
              />
            </div>
          </div>
        </div>

        {/* Industry & Market Dropdowns */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-base font-semibold">
              Industry
            </Label>
            <Select
              onValueChange={(value) => setValue("industry", value)}
              defaultValue={watch("industry")}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="consumer-products">Consumer Products</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="cosmetics-beauty">Cosmetics & Beauty</SelectItem>
                <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                <SelectItem value="hospitality">Hospitality</SelectItem>
                <SelectItem value="tech-saas">Tech / SaaS</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="fitness-wellness">Fitness & Wellness</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Market */}
          <div className="space-y-2">
            <Label htmlFor="market" className="text-base font-semibold">
              Market / Country
            </Label>
            <Select
              onValueChange={(value) => setValue("market", value)}
              defaultValue={watch("market")}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="worldwide">Worldwide</SelectItem>
                <SelectItem value="europe">Europe</SelectItem>
                <SelectItem value="france">France</SelectItem>
                <SelectItem value="uk">UK</SelectItem>
                <SelectItem value="usa">USA</SelectItem>
                <SelectItem value="latam">LATAM</SelectItem>
                <SelectItem value="middle-east">Middle East</SelectItem>
                <SelectItem value="asia-pacific">Asia-Pacific</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-[1.02] shadow-[var(--shadow-soft)]"
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
