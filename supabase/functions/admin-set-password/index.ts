import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { auth_user_id, email, new_password, pin } = await req.json();

    if (pin !== "1234") {
      return new Response(JSON.stringify({ error: "PIN de gerente inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!new_password || new_password.length < 4) {
      return new Response(JSON.stringify({ error: "Dados inválidos. Senha deve ter ao menos 4 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let targetAuthId = auth_user_id;

    if (targetAuthId) {
      const { error } = await admin.auth.admin.updateUserById(targetAuthId, {
        password: new_password,
      });

      if (!error) {
        return new Response(JSON.stringify({ success: true, auth_user_id: targetAuthId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (email) {
      const { data: usersData } = await admin.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
      );

      if (existingUser) {
        targetAuthId = existingUser.id;
        const { error: updateErr } = await admin.auth.admin.updateUserById(targetAuthId, {
          password: new_password,
        });

        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, auth_user_id: targetAuthId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
          email: email.trim(),
          password: new_password,
          email_confirm: true,
        });

        if (createErr) {
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, auth_user_id: newUser.user.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Identificador de usuário ou e-mail não fornecido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

