import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user is a super admin
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      console.error("Failed to get requesting user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is super admin
    const { data: usuarioData, error: usuarioError } = await supabaseAdmin
      .from("usuario")
      .select("superadm")
      .eq("auth_id", requestingUser.id)
      .maybeSingle();

    if (usuarioError || !usuarioData?.superadm) {
      console.error("User is not a super admin:", usuarioError);
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas super usuários podem realizar esta ação." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();
    console.log(`Admin action: ${action}`, params);

    switch (action) {
      case "list": {
        // List all users from usuario table
        const { data: usuarios, error } = await supabaseAdmin
          .from("usuario")
          .select("*")
          .order("nome", { ascending: true });

        if (error) {
          console.error("Error listing users:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get auth users to include email
        const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error listing auth users:", authError);
        }

        // Merge usuario data with auth data
        const mergedUsers = usuarios?.map((usuario) => {
          const authUser = authUsers?.find((u) => u.id === usuario.auth_id);
          return {
            ...usuario,
            auth_email: authUser?.email || usuario.email,
            auth_created_at: authUser?.created_at,
            last_sign_in_at: authUser?.last_sign_in_at,
          };
        });

        return new Response(
          JSON.stringify({ users: mergedUsers }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        const { email, password, nome, telefone, cargo } = params;

        if (!email || !password || !nome) {
          return new Response(
            JSON.stringify({ error: "Email, senha e nome são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (authError) {
          console.error("Error creating auth user:", authError);
          return new Response(
            JSON.stringify({ error: authError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create usuario record
        const { data: usuario, error: usuarioCreateError } = await supabaseAdmin
          .from("usuario")
          .insert({
            auth_id: authData.user.id,
            uid: authData.user.id,
            email,
            nome,
            telefone,
            cargo,
            ativo: true,
            superadm: false,
          })
          .select()
          .single();

        if (usuarioCreateError) {
          console.error("Error creating usuario record:", usuarioCreateError);
          // Try to delete the auth user if usuario creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return new Response(
            JSON.stringify({ error: usuarioCreateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("User created successfully:", usuario);
        return new Response(
          JSON.stringify({ user: usuario }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        const { id, nome, telefone, cargo, ativo, superadm } = params;

        if (!id) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (nome !== undefined) updateData.nome = nome;
        if (telefone !== undefined) updateData.telefone = telefone;
        if (cargo !== undefined) updateData.cargo = cargo;
        if (ativo !== undefined) updateData.ativo = ativo;
        if (superadm !== undefined) updateData.superadm = superadm;

        const { data: usuario, error } = await supabaseAdmin
          .from("usuario")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Error updating user:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("User updated successfully:", usuario);
        return new Response(
          JSON.stringify({ user: usuario }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "updatePassword": {
        const { auth_id, newPassword } = params;

        if (!auth_id || !newPassword) {
          return new Response(
            JSON.stringify({ error: "ID do usuário e nova senha são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (newPassword.length < 6) {
          return new Response(
            JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(auth_id, {
          password: newPassword,
        });

        if (error) {
          console.error("Error updating password:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Password updated successfully for user:", auth_id);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { id, auth_id } = params;

        if (!id) {
          return new Response(
            JSON.stringify({ error: "ID do usuário é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete from usuario table first
        const { error: usuarioDeleteError } = await supabaseAdmin
          .from("usuario")
          .delete()
          .eq("id", id);

        if (usuarioDeleteError) {
          console.error("Error deleting usuario:", usuarioDeleteError);
          return new Response(
            JSON.stringify({ error: usuarioDeleteError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete auth user if auth_id provided
        if (auth_id) {
          const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
          if (authDeleteError) {
            console.error("Error deleting auth user:", authDeleteError);
            // Don't return error, usuario was already deleted
          }
        }

        console.log("User deleted successfully:", id);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
