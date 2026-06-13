import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const shippingSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone must be valid").max(15),
  addressLine1: z.string().min(5, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().length(6, "Pincode must be 6 digits"),
});

export type ShippingFormData = z.infer<typeof shippingSchema>;

interface ShippingFormProps {
  onSubmit: (data: ShippingFormData) => void;
  loading?: boolean;
}

export function ShippingForm({ onSubmit, loading = false }: ShippingFormProps) {
  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone *</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="9876543210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="addressLine1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 1 *</FormLabel>
                <FormControl>
                  <Input placeholder="House No, Street Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="addressLine2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2 (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Apartment, Landmark" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input placeholder="Mumbai" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input placeholder="Maharashtra" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pincode *</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="400001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Continue to Payment"}
        </Button>
      </form>
    </Form>
  );
}
