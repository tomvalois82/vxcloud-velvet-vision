export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      atividade: {
        Row: {
          concluida: boolean | null
          created_at: string
          data_hora: string | null
          descricao: string | null
          id: number
          id_lead: number | null
          id_oportunidade: number | null
          id_usuario: number | null
          obs: string | null
          tipo: string | null
        }
        Insert: {
          concluida?: boolean | null
          created_at?: string
          data_hora?: string | null
          descricao?: string | null
          id?: number
          id_lead?: number | null
          id_oportunidade?: number | null
          id_usuario?: number | null
          obs?: string | null
          tipo?: string | null
        }
        Update: {
          concluida?: boolean | null
          created_at?: string
          data_hora?: string | null
          descricao?: string | null
          id?: number
          id_lead?: number | null
          id_oportunidade?: number | null
          id_usuario?: number | null
          obs?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividade_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_id_oportunidade_fkey"
            columns: ["id_oportunidade"]
            isOneToOne: false
            referencedRelation: "opotunidade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividade_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      barbearia_gigante_profissionais: {
        Row: {
          calendar_client_ID: string | null
          calendar_Client_Secret: string | null
          created_at: string
          id: number
          nome: string | null
          telefone: string | null
        }
        Insert: {
          calendar_client_ID?: string | null
          calendar_Client_Secret?: string | null
          created_at?: string
          id?: number
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          calendar_client_ID?: string | null
          calendar_Client_Secret?: string | null
          created_at?: string
          id?: number
          nome?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      barberia_gigante_historico: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          access_token_olx: string | null
          alertaNovo: boolean | null
          apikeyvoice: string | null
          ativo: boolean | null
          ativoolx: boolean | null
          audioativo: boolean | null
          codVoice: string | null
          created_at: string
          empresa: string | null
          evo_instancia: string | null
          evo_key: string | null
          folowupativo: boolean | null
          fotoloja: string | null
          grupoReceptor: string | null
          id: number
          id_phone_wtz_api: string | null
          idusuario: number | null
          krayincrm: boolean | null
          latitude: string | null
          link_wh_ocr: string | null
          link_wh_ocr_estoque: string | null
          longitude: string | null
          mensagens_folowup: string[] | null
          pausa: number | null
          promptolx: string | null
          promptwtz: string | null
          receptor: Database["public"]["Enums"]["cargos"] | null
          t1folowup: number | null
          t2folowup: number | null
          t3folowup: number | null
          t4folowup: number | null
          telefone: string | null
          tempofolowup: number | null
          temporesposta: number | null
          versao_waba: string | null
          waba_id: string | null
          webhook_olx: string | null
        }
        Insert: {
          access_token_olx?: string | null
          alertaNovo?: boolean | null
          apikeyvoice?: string | null
          ativo?: boolean | null
          ativoolx?: boolean | null
          audioativo?: boolean | null
          codVoice?: string | null
          created_at?: string
          empresa?: string | null
          evo_instancia?: string | null
          evo_key?: string | null
          folowupativo?: boolean | null
          fotoloja?: string | null
          grupoReceptor?: string | null
          id?: number
          id_phone_wtz_api?: string | null
          idusuario?: number | null
          krayincrm?: boolean | null
          latitude?: string | null
          link_wh_ocr?: string | null
          link_wh_ocr_estoque?: string | null
          longitude?: string | null
          mensagens_folowup?: string[] | null
          pausa?: number | null
          promptolx?: string | null
          promptwtz?: string | null
          receptor?: Database["public"]["Enums"]["cargos"] | null
          t1folowup?: number | null
          t2folowup?: number | null
          t3folowup?: number | null
          t4folowup?: number | null
          telefone?: string | null
          tempofolowup?: number | null
          temporesposta?: number | null
          versao_waba?: string | null
          waba_id?: string | null
          webhook_olx?: string | null
        }
        Update: {
          access_token_olx?: string | null
          alertaNovo?: boolean | null
          apikeyvoice?: string | null
          ativo?: boolean | null
          ativoolx?: boolean | null
          audioativo?: boolean | null
          codVoice?: string | null
          created_at?: string
          empresa?: string | null
          evo_instancia?: string | null
          evo_key?: string | null
          folowupativo?: boolean | null
          fotoloja?: string | null
          grupoReceptor?: string | null
          id?: number
          id_phone_wtz_api?: string | null
          idusuario?: number | null
          krayincrm?: boolean | null
          latitude?: string | null
          link_wh_ocr?: string | null
          link_wh_ocr_estoque?: string | null
          longitude?: string | null
          mensagens_folowup?: string[] | null
          pausa?: number | null
          promptolx?: string | null
          promptwtz?: string | null
          receptor?: Database["public"]["Enums"]["cargos"] | null
          t1folowup?: number | null
          t2folowup?: number | null
          t3folowup?: number | null
          t4folowup?: number | null
          telefone?: string | null
          tempofolowup?: number | null
          temporesposta?: number | null
          versao_waba?: string | null
          waba_id?: string | null
          webhook_olx?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_idusuario_fkey"
            columns: ["idusuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_cliente: {
        Row: {
          created_at: string | null
          id: number
          sessionid: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          sessionid?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          sessionid?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      empresa: {
        Row: {
          bairro: string
          cep: string
          cnpj: string | null
          complemento: string | null
          email: string
          estado: string
          foto_url: string | null
          id: string
          id_config: number
          latitude: string | null
          logradouro: string
          longitude: string | null
          meta_crescimento: number | null
          municipio: string
          nome_fantasia: string
          numero: string
          ponto_referencia: string | null
          razao_social: string
          site: string | null
          telefone: string | null
          tipo_pessoa: string
        }
        Insert: {
          bairro: string
          cep: string
          cnpj?: string | null
          complemento?: string | null
          email: string
          estado: string
          foto_url?: string | null
          id?: string
          id_config: number
          latitude?: string | null
          logradouro: string
          longitude?: string | null
          meta_crescimento?: number | null
          municipio: string
          nome_fantasia: string
          numero: string
          ponto_referencia?: string | null
          razao_social: string
          site?: string | null
          telefone?: string | null
          tipo_pessoa: string
        }
        Update: {
          bairro?: string
          cep?: string
          cnpj?: string | null
          complemento?: string | null
          email?: string
          estado?: string
          foto_url?: string | null
          id?: string
          id_config?: number
          latitude?: string | null
          logradouro?: string
          longitude?: string | null
          meta_crescimento?: number | null
          municipio?: string
          nome_fantasia?: string
          numero?: string
          ponto_referencia?: string | null
          razao_social?: string
          site?: string | null
          telefone?: string | null
          tipo_pessoa?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_id_config_fkey"
            columns: ["id_config"]
            isOneToOne: true
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          adquirido_de: string | null
          ano: string | null
          ano_fabricacao: string | null
          cambio: string | null
          caracteristicas: string | null
          categoria: string | null
          cautelar: string | null
          chassi: string | null
          config: number | null
          cor: string | null
          created_at: string
          data_aquisicao: string
          fabricante: string | null
          ficha_tecnica: string | null
          foto: string | null
          fotos: string[] | null
          garantia: string | null
          id: number
          id_empresa: string
          idanuncioolx: string[] | null
          idEstoqueBubble: string | null
          idOlx: string | null
          km: string | null
          modelo: string | null
          motor: string | null
          observacao: string | null
          placa: string | null
          renavan: number | null
          status: string | null
          tipo_aquisicao: string
          tipo_veiculo: string | null
          uid: string | null
          usuario: number | null
          valor: string | null
          valor_aquisicao: number
          video: string | null
        }
        Insert: {
          adquirido_de?: string | null
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          chassi?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          data_aquisicao?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          id_empresa: string
          idanuncioolx?: string[] | null
          idEstoqueBubble?: string | null
          idOlx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          placa?: string | null
          renavan?: number | null
          status?: string | null
          tipo_aquisicao?: string
          tipo_veiculo?: string | null
          uid?: string | null
          usuario?: number | null
          valor?: string | null
          valor_aquisicao?: number
          video?: string | null
        }
        Update: {
          adquirido_de?: string | null
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          chassi?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          data_aquisicao?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          id_empresa?: string
          idanuncioolx?: string[] | null
          idEstoqueBubble?: string | null
          idOlx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          placa?: string | null
          renavan?: number | null
          status?: string | null
          tipo_aquisicao?: string
          tipo_veiculo?: string | null
          uid?: string | null
          usuario?: number | null
          valor?: string | null
          valor_aquisicao?: number
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_adquirido_de_fkey"
            columns: ["adquirido_de"]
            isOneToOne: false
            referencedRelation: "vw_investidor_carteira"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "estoque_adquirido_de_fkey"
            columns: ["adquirido_de"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_investidor"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "estoque_adquirido_de_fkey"
            columns: ["adquirido_de"]
            isOneToOne: false
            referencedRelation: "vx_pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_config_fkey"
            columns: ["config"]
            isOneToOne: false
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_usuario_fkey"
            columns: ["usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_estoque_empresa"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_anexos: {
        Row: {
          base64: string | null
          criado_at: string | null
          id: string
          id_estoque: number
          nome_arquivo: string
          tipo_mime: string
          url_arquivo: string | null
        }
        Insert: {
          base64?: string | null
          criado_at?: string | null
          id?: string
          id_estoque: number
          nome_arquivo: string
          tipo_mime: string
          url_arquivo?: string | null
        }
        Update: {
          base64?: string | null
          criado_at?: string | null
          id?: string
          id_estoque?: number
          nome_arquivo?: string
          tipo_mime?: string
          url_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_anexos_id_estoque_fkey"
            columns: ["id_estoque"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_iputinga: {
        Row: {
          ano: string | null
          ano_fabricacao: string | null
          cambio: string | null
          caracteristicas: string | null
          categoria: string | null
          cautelar: string | null
          config: number | null
          cor: string | null
          created_at: string
          fabricante: string | null
          ficha_tecnica: string | null
          foto: string | null
          fotos: string[] | null
          garantia: string | null
          id: number
          idEstoqueBubble: string | null
          idolx: string | null
          km: string | null
          modelo: string | null
          motor: string | null
          observacao: string | null
          status: string | null
          tipo_veiculo: string | null
          uid: string | null
          valor: string | null
          video: string | null
        }
        Insert: {
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          idEstoqueBubble?: string | null
          idolx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          status?: string | null
          tipo_veiculo?: string | null
          uid?: string | null
          valor?: string | null
          video?: string | null
        }
        Update: {
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          idEstoqueBubble?: string | null
          idolx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          status?: string | null
          tipo_veiculo?: string | null
          uid?: string | null
          valor?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_iputinga_config_fkey"
            columns: ["config"]
            isOneToOne: false
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_iputinga_prime: {
        Row: {
          ano: string | null
          ano_fabricacao: string | null
          cambio: string | null
          caracteristicas: string | null
          categoria: string | null
          cautelar: string | null
          config: number | null
          cor: string | null
          created_at: string
          fabricante: string | null
          ficha_tecnica: string | null
          foto: string | null
          fotos: string[] | null
          garantia: string | null
          id: number
          idanuncioolx: string[] | null
          idEstoqueBubble: string | null
          idOlx: string | null
          km: string | null
          modelo: string | null
          motor: string | null
          observacao: string | null
          status: string | null
          tipo_veiculo: string | null
          uid: string | null
          usuario: number | null
          valor: string | null
          video: string | null
        }
        Insert: {
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          idanuncioolx?: string[] | null
          idEstoqueBubble?: string | null
          idOlx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          status?: string | null
          tipo_veiculo?: string | null
          uid?: string | null
          usuario?: number | null
          valor?: string | null
          video?: string | null
        }
        Update: {
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          idanuncioolx?: string[] | null
          idEstoqueBubble?: string | null
          idOlx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          status?: string | null
          tipo_veiculo?: string | null
          uid?: string | null
          usuario?: number | null
          valor?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_iputinga_prime_config_fkey"
            columns: ["config"]
            isOneToOne: false
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_iputinga_prime_usuario_fkey"
            columns: ["usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_vxgo: {
        Row: {
          ano: string | null
          ano_fabricacao: string | null
          cambio: string | null
          caracteristicas: string | null
          categoria: string | null
          cautelar: string | null
          config: number | null
          cor: string | null
          created_at: string
          fabricante: string | null
          ficha_tecnica: string | null
          foto: string | null
          fotos: string[] | null
          garantia: string | null
          id: number
          idanuncioolx: string[] | null
          idEstoqueBubble: string | null
          idOlx: string | null
          km: string | null
          modelo: string | null
          motor: string | null
          observacao: string | null
          status: string | null
          tipo_veiculo: string | null
          uid: string | null
          usuario: number | null
          valor: string | null
          video: string | null
        }
        Insert: {
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          idanuncioolx?: string[] | null
          idEstoqueBubble?: string | null
          idOlx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          status?: string | null
          tipo_veiculo?: string | null
          uid?: string | null
          usuario?: number | null
          valor?: string | null
          video?: string | null
        }
        Update: {
          ano?: string | null
          ano_fabricacao?: string | null
          cambio?: string | null
          caracteristicas?: string | null
          categoria?: string | null
          cautelar?: string | null
          config?: number | null
          cor?: string | null
          created_at?: string
          fabricante?: string | null
          ficha_tecnica?: string | null
          foto?: string | null
          fotos?: string[] | null
          garantia?: string | null
          id?: number
          idanuncioolx?: string[] | null
          idEstoqueBubble?: string | null
          idOlx?: string | null
          km?: string | null
          modelo?: string | null
          motor?: string | null
          observacao?: string | null
          status?: string | null
          tipo_veiculo?: string | null
          uid?: string | null
          usuario?: number | null
          valor?: string | null
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_vxgo_config_fkey"
            columns: ["config"]
            isOneToOne: false
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_vxgo_usuario_fkey"
            columns: ["usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      exemplos_vx: {
        Row: {
          created_at: string
          id: number
          mensagem: string | null
          sugestao: string | null
          tipo: string | null
          titulo: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          mensagem?: string | null
          sugestao?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          mensagem?: string | null
          sugestao?: string | null
          tipo?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
      kanban: {
        Row: {
          created_at: string
          descricao: string | null
          id: number
          posicao: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: number
          posicao?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: number
          posicao?: number | null
        }
        Relationships: []
      }
      langchain_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      lead: {
        Row: {
          config: number | null
          created_at: string
          email: string | null
          folowup: number | null
          id: number
          idUsuario: number | null
          interesse: string | null
          intervencao: string | null
          nome: string | null
          Origem: string | null
          proximofolowup: string | null
          session_id_olx: string | null
          session_id_whatsaap: string | null
          stop: boolean | null
          telefone: string | null
        }
        Insert: {
          config?: number | null
          created_at?: string
          email?: string | null
          folowup?: number | null
          id?: number
          idUsuario?: number | null
          interesse?: string | null
          intervencao?: string | null
          nome?: string | null
          Origem?: string | null
          proximofolowup?: string | null
          session_id_olx?: string | null
          session_id_whatsaap?: string | null
          stop?: boolean | null
          telefone?: string | null
        }
        Update: {
          config?: number | null
          created_at?: string
          email?: string | null
          folowup?: number | null
          id?: number
          idUsuario?: number | null
          interesse?: string | null
          intervencao?: string | null
          nome?: string | null
          Origem?: string | null
          proximofolowup?: string | null
          session_id_olx?: string | null
          session_id_whatsaap?: string | null
          stop?: boolean | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_config_fkey"
            columns: ["config"]
            isOneToOne: false
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_idUsuario_fkey"
            columns: ["idUsuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_historico_iputinga_prime: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_historico_olx_vx: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_megan_followup: {
        Row: {
          created_at: string
          encerrado: boolean | null
          etapa: number | null
          id: number
          instancia: string | null
          mensagem: string | null
          telefone: string | null
          time: string | null
          token: string | null
          url_agente: string | null
        }
        Insert: {
          created_at?: string
          encerrado?: boolean | null
          etapa?: number | null
          id?: number
          instancia?: string | null
          mensagem?: string | null
          telefone?: string | null
          time?: string | null
          token?: string | null
          url_agente?: string | null
        }
        Update: {
          created_at?: string
          encerrado?: boolean | null
          etapa?: number | null
          id?: number
          instancia?: string | null
          mensagem?: string | null
          telefone?: string | null
          time?: string | null
          token?: string | null
          url_agente?: string | null
        }
        Relationships: []
      }
      n8n_megan_historico: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_megan_vxgo: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      opotunidade: {
        Row: {
          created_at: string
          data_criacao: string | null
          id: number
          id_kanban: number | null
          id_lead: number | null
          id_usuario: number | null
          idEstoque: number | null
          obs: string | null
          resumo: string | null
          session_id_olx: string | null
          session_id_whatsapp: string | null
          status: string | null
          titulo: string | null
          ultima_interacao: string | null
          valor: string | null
        }
        Insert: {
          created_at?: string
          data_criacao?: string | null
          id?: number
          id_kanban?: number | null
          id_lead?: number | null
          id_usuario?: number | null
          idEstoque?: number | null
          obs?: string | null
          resumo?: string | null
          session_id_olx?: string | null
          session_id_whatsapp?: string | null
          status?: string | null
          titulo?: string | null
          ultima_interacao?: string | null
          valor?: string | null
        }
        Update: {
          created_at?: string
          data_criacao?: string | null
          id?: number
          id_kanban?: number | null
          id_lead?: number | null
          id_usuario?: number | null
          idEstoque?: number | null
          obs?: string | null
          resumo?: string | null
          session_id_olx?: string | null
          session_id_whatsapp?: string | null
          status?: string | null
          titulo?: string | null
          ultima_interacao?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opotunidade_id_kanban_fkey"
            columns: ["id_kanban"]
            isOneToOne: false
            referencedRelation: "kanban"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opotunidade_id_lead_fkey"
            columns: ["id_lead"]
            isOneToOne: false
            referencedRelation: "lead"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opotunidade_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          apikeyvoice: string | null
          ativo: boolean | null
          auth_id: string | null
          cargo: Database["public"]["Enums"]["cargos"] | null
          codVoice: string | null
          config: number | null
          created_at: string
          credencialOlx: string | null
          email: string | null
          evo_instancia: string | null
          evo_key: string | null
          id: number
          idbubble: string | null
          n8nOlx: string | null
          nome: string | null
          prompt_whatsapp: string | null
          superadm: boolean | null
          tbEstoque: string | null
          tbHistorico: string | null
          tbHistoricoOlx: string | null
          telefone: string | null
          uid: string | null
        }
        Insert: {
          apikeyvoice?: string | null
          ativo?: boolean | null
          auth_id?: string | null
          cargo?: Database["public"]["Enums"]["cargos"] | null
          codVoice?: string | null
          config?: number | null
          created_at?: string
          credencialOlx?: string | null
          email?: string | null
          evo_instancia?: string | null
          evo_key?: string | null
          id?: number
          idbubble?: string | null
          n8nOlx?: string | null
          nome?: string | null
          prompt_whatsapp?: string | null
          superadm?: boolean | null
          tbEstoque?: string | null
          tbHistorico?: string | null
          tbHistoricoOlx?: string | null
          telefone?: string | null
          uid?: string | null
        }
        Update: {
          apikeyvoice?: string | null
          ativo?: boolean | null
          auth_id?: string | null
          cargo?: Database["public"]["Enums"]["cargos"] | null
          codVoice?: string | null
          config?: number | null
          created_at?: string
          credencialOlx?: string | null
          email?: string | null
          evo_instancia?: string | null
          evo_key?: string | null
          id?: number
          idbubble?: string | null
          n8nOlx?: string | null
          nome?: string | null
          prompt_whatsapp?: string | null
          superadm?: boolean | null
          tbEstoque?: string | null
          tbHistorico?: string | null
          tbHistoricoOlx?: string | null
          telefone?: string | null
          uid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_config_fkey"
            columns: ["config"]
            isOneToOne: false
            referencedRelation: "config"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_fin_anexo: {
        Row: {
          base64: string | null
          id: string
          id_movimento: string
          nome_arquivo: string
          tipo_mime: string | null
          url_arquivo: string | null
        }
        Insert: {
          base64?: string | null
          id?: string
          id_movimento: string
          nome_arquivo: string
          tipo_mime?: string | null
          url_arquivo?: string | null
        }
        Update: {
          base64?: string | null
          id?: string
          id_movimento?: string
          nome_arquivo?: string
          tipo_mime?: string | null
          url_arquivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vx_fin_anexo_id_movimento_fkey"
            columns: ["id_movimento"]
            isOneToOne: false
            referencedRelation: "vx_fin_movimento"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_fin_cartao: {
        Row: {
          ativo: boolean
          bandeira: string
          descricao: string | null
          dia_fechamento: number
          dia_vencimento: number
          final: string
          id: string
          id_empresa: string
          id_forma_pagamento: string
          limite: number
          nome_impresso: string
          padrao: boolean
        }
        Insert: {
          ativo: boolean
          bandeira: string
          descricao?: string | null
          dia_fechamento: number
          dia_vencimento: number
          final: string
          id?: string
          id_empresa: string
          id_forma_pagamento: string
          limite: number
          nome_impresso: string
          padrao?: boolean
        }
        Update: {
          ativo?: boolean
          bandeira?: string
          descricao?: string | null
          dia_fechamento?: number
          dia_vencimento?: number
          final?: string
          id?: string
          id_empresa?: string
          id_forma_pagamento?: string
          limite?: number
          nome_impresso?: string
          padrao?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vx_fin_cartao_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_cartao_id_forma_pagamento_fkey"
            columns: ["id_forma_pagamento"]
            isOneToOne: false
            referencedRelation: "vx_forma_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_fin_categoria: {
        Row: {
          ativo: boolean
          categoria: string
          classificacao: string | null
          dre: boolean
          id: string
          id_categoria_pai: string | null
          operacao: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          classificacao?: string | null
          dre?: boolean
          id?: string
          id_categoria_pai?: string | null
          operacao: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          classificacao?: string | null
          dre?: boolean
          id?: string
          id_categoria_pai?: string | null
          operacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "vx_fin_categoria_id_categoria_pai_fkey"
            columns: ["id_categoria_pai"]
            isOneToOne: false
            referencedRelation: "vx_fin_categoria"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_fin_conta: {
        Row: {
          banco: string
          descricao: string | null
          eh_virtual: boolean | null
          id: string
          id_empresa: string
          padrao: boolean
          saldo: number
        }
        Insert: {
          banco: string
          descricao?: string | null
          eh_virtual?: boolean | null
          id?: string
          id_empresa: string
          padrao?: boolean
          saldo?: number
        }
        Update: {
          banco?: string
          descricao?: string | null
          eh_virtual?: boolean | null
          id?: string
          id_empresa?: string
          padrao?: boolean
          saldo?: number
        }
        Relationships: [
          {
            foreignKeyName: "vx_fin_conta_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_fin_movimento: {
        Row: {
          acrescimo: number | null
          competencia: string | null
          conciliado: boolean
          data_compra: string | null
          data_pagamento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string | null
          id: string
          id_cartao: string | null
          id_categoria: string | null
          id_conta: string | null
          id_conta_destino: string | null
          id_empresa: string
          id_estoque: number | null
          id_forma_pagamento: string | null
          id_pessoa: string | null
          id_venda: string | null
          motivo_ajuste: string | null
          observacoes: string | null
          ordem_ocorrencia: number | null
          recorrencia_id: string | null
          status: string
          tipo_movimento: string
          total_ocorrencias: number | null
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          acrescimo?: number | null
          competencia?: string | null
          conciliado?: boolean
          data_compra?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao?: string | null
          id?: string
          id_cartao?: string | null
          id_categoria?: string | null
          id_conta?: string | null
          id_conta_destino?: string | null
          id_empresa: string
          id_estoque?: number | null
          id_forma_pagamento?: string | null
          id_pessoa?: string | null
          id_venda?: string | null
          motivo_ajuste?: string | null
          observacoes?: string | null
          ordem_ocorrencia?: number | null
          recorrencia_id?: string | null
          status?: string
          tipo_movimento: string
          total_ocorrencias?: number | null
          valor_bruto: number
          valor_liquido?: number
        }
        Update: {
          acrescimo?: number | null
          competencia?: string | null
          conciliado?: boolean
          data_compra?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string | null
          id?: string
          id_cartao?: string | null
          id_categoria?: string | null
          id_conta?: string | null
          id_conta_destino?: string | null
          id_empresa?: string
          id_estoque?: number | null
          id_forma_pagamento?: string | null
          id_pessoa?: string | null
          id_venda?: string | null
          motivo_ajuste?: string | null
          observacoes?: string | null
          ordem_ocorrencia?: number | null
          recorrencia_id?: string | null
          status?: string
          tipo_movimento?: string
          total_ocorrencias?: number | null
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_vx_fin_movimento_venda"
            columns: ["id_venda"]
            isOneToOne: false
            referencedRelation: "vx_vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_cartao_fkey"
            columns: ["id_cartao"]
            isOneToOne: false
            referencedRelation: "vx_fin_cartao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "vx_fin_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_conta_destino_fkey"
            columns: ["id_conta_destino"]
            isOneToOne: false
            referencedRelation: "vx_fin_conta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_conta_fkey"
            columns: ["id_conta"]
            isOneToOne: false
            referencedRelation: "vx_fin_conta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_estoque_fkey"
            columns: ["id_estoque"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_forma_pagamento_fkey"
            columns: ["id_forma_pagamento"]
            isOneToOne: false
            referencedRelation: "vx_forma_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vw_investidor_carteira"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_investidor"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_fin_movimento_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vx_pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_financeiras: {
        Row: {
          ativa: boolean
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          ativa?: boolean
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          ativa?: boolean
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      vx_forma_pagamento: {
        Row: {
          ativa: boolean
          descricao: string
          id: string
          id_conta_padrao: string | null
        }
        Insert: {
          ativa?: boolean
          descricao: string
          id?: string
          id_conta_padrao?: string | null
        }
        Update: {
          ativa?: boolean
          descricao?: string
          id?: string
          id_conta_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vx_forma_pagamento_id_conta_padrao_fkey"
            columns: ["id_conta_padrao"]
            isOneToOne: false
            referencedRelation: "vx_fin_conta"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_investimento: {
        Row: {
          data_criacao: string
          data_finalizado: string | null
          id: string
          id_estoque: number
          id_grupo_wtz: string | null
          id_pessoa: string
          percentual_investido: number
          valor_custos: number | null
          valor_investido: number
          valor_lucro: number | null
        }
        Insert: {
          data_criacao?: string
          data_finalizado?: string | null
          id?: string
          id_estoque: number
          id_grupo_wtz?: string | null
          id_pessoa: string
          percentual_investido: number
          valor_custos?: number | null
          valor_investido: number
          valor_lucro?: number | null
        }
        Update: {
          data_criacao?: string
          data_finalizado?: string | null
          id?: string
          id_estoque?: number
          id_grupo_wtz?: string | null
          id_pessoa?: string
          percentual_investido?: number
          valor_custos?: number | null
          valor_investido?: number
          valor_lucro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vx_investimento_id_estoque_fkey"
            columns: ["id_estoque"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_investimento_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vw_investidor_carteira"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_investimento_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_investidor"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_investimento_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vx_pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_investimento_carteira: {
        Row: {
          created_at: string | null
          data: string
          descricao: string | null
          id: string
          id_estoque: number | null
          id_investimento: string | null
          id_movimento: string | null
          id_pessoa: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          data: string
          descricao?: string | null
          id?: string
          id_estoque?: number | null
          id_investimento?: string | null
          id_movimento?: string | null
          id_pessoa: string
          valor: number
        }
        Update: {
          created_at?: string | null
          data?: string
          descricao?: string | null
          id?: string
          id_estoque?: number | null
          id_investimento?: string | null
          id_movimento?: string | null
          id_pessoa?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_id_movimento_carteira"
            columns: ["id_movimento"]
            isOneToOne: false
            referencedRelation: "vx_fin_movimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_investimento_carteira_id_investimento_fkey"
            columns: ["id_investimento"]
            isOneToOne: false
            referencedRelation: "vx_investimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_investimento_carteira_id_movimento_fkey"
            columns: ["id_movimento"]
            isOneToOne: false
            referencedRelation: "vx_fin_movimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_investimento_carteira_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vw_investidor_carteira"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_investimento_carteira_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_investidor"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_investimento_carteira_id_pessoa_fkey"
            columns: ["id_pessoa"]
            isOneToOne: false
            referencedRelation: "vx_pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_pessoa: {
        Row: {
          atualizado_em: string
          bairro: string | null
          cep: string | null
          complemento: string | null
          cpf_cnpj: string | null
          criado_em: string
          descricao: string | null
          eh_cliente: boolean
          eh_colaborador: boolean
          eh_fornecedor: boolean
          eh_investidor: boolean
          email: string | null
          estado: string | null
          id: string
          id_empresa: string
          logradouro: string | null
          municipio: string | null
          nome: string
          numero: string | null
          padrao: boolean
          ponto_referencia: string | null
          telefone: string | null
          tipo_cadastro: string | null
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          descricao?: string | null
          eh_cliente?: boolean
          eh_colaborador?: boolean
          eh_fornecedor?: boolean
          eh_investidor?: boolean
          email?: string | null
          estado?: string | null
          id?: string
          id_empresa: string
          logradouro?: string | null
          municipio?: string | null
          nome: string
          numero?: string | null
          padrao?: boolean
          ponto_referencia?: string | null
          telefone?: string | null
          tipo_cadastro?: string | null
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          descricao?: string | null
          eh_cliente?: boolean
          eh_colaborador?: boolean
          eh_fornecedor?: boolean
          eh_investidor?: boolean
          email?: string | null
          estado?: string | null
          id?: string
          id_empresa?: string
          logradouro?: string | null
          municipio?: string | null
          nome?: string
          numero?: string | null
          padrao?: boolean
          ponto_referencia?: string | null
          telefone?: string | null
          tipo_cadastro?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vx_pessoa_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_snapshots: {
        Row: {
          contas_a_receber: number | null
          created_at: string | null
          estoque_atual: Json
          id: string
          id_empresa: string
          investimento_atual: Json | null
          mes_referencia: string
          saldo: number | null
          total_estimado: number | null
          total_estoque: number | null
          venda_atual: Json | null
        }
        Insert: {
          contas_a_receber?: number | null
          created_at?: string | null
          estoque_atual?: Json
          id?: string
          id_empresa: string
          investimento_atual?: Json | null
          mes_referencia: string
          saldo?: number | null
          total_estimado?: number | null
          total_estoque?: number | null
          venda_atual?: Json | null
        }
        Update: {
          contas_a_receber?: number | null
          created_at?: string | null
          estoque_atual?: Json
          id?: string
          id_empresa?: string
          investimento_atual?: Json | null
          mes_referencia?: string
          saldo?: number | null
          total_estimado?: number | null
          total_estoque?: number | null
          venda_atual?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_vx_snapshots_empresa"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_veiculos_consultados: {
        Row: {
          ano_fabricacao: number | null
          ano_modelo: number | null
          chassi: string
          codigo_fipe: string | null
          combustivel: string | null
          cor: string | null
          data_consulta: string
          fabricante: string | null
          id: string
          json_completo: Json | null
          modelo: string | null
          municipio: string | null
          placa: string
          situacao_restricao: string | null
          situacao_veiculo: string | null
          uf: string | null
          valor_fipe: number | null
          versao: string | null
        }
        Insert: {
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          chassi: string
          codigo_fipe?: string | null
          combustivel?: string | null
          cor?: string | null
          data_consulta: string
          fabricante?: string | null
          id?: string
          json_completo?: Json | null
          modelo?: string | null
          municipio?: string | null
          placa: string
          situacao_restricao?: string | null
          situacao_veiculo?: string | null
          uf?: string | null
          valor_fipe?: number | null
          versao?: string | null
        }
        Update: {
          ano_fabricacao?: number | null
          ano_modelo?: number | null
          chassi?: string
          codigo_fipe?: string | null
          combustivel?: string | null
          cor?: string | null
          data_consulta?: string
          fabricante?: string | null
          id?: string
          json_completo?: Json | null
          modelo?: string | null
          municipio?: string | null
          placa?: string
          situacao_restricao?: string | null
          situacao_veiculo?: string | null
          uf?: string | null
          valor_fipe?: number | null
          versao?: string | null
        }
        Relationships: []
      }
      vx_vendas: {
        Row: {
          data_venda: string
          fechada: boolean
          id: string
          id_cliente: string
          id_empresa: string
          id_veiculo_vendido: number
          id_vendedor: string | null
          observacoes: string | null
          valor_total_venda: number
        }
        Insert: {
          data_venda?: string
          fechada?: boolean
          id?: string
          id_cliente: string
          id_empresa: string
          id_veiculo_vendido: number
          id_vendedor?: string | null
          observacoes?: string | null
          valor_total_venda: number
        }
        Update: {
          data_venda?: string
          fechada?: boolean
          id?: string
          id_cliente?: string
          id_empresa?: string
          id_veiculo_vendido?: number
          id_vendedor?: string | null
          observacoes?: string | null
          valor_total_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "vx_vendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_investidor_carteira"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_vendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_investidor"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_vendas_id_cliente_fkey"
            columns: ["id_cliente"]
            isOneToOne: false
            referencedRelation: "vx_pessoa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_id_veiculo_vendido_fkey"
            columns: ["id_veiculo_vendido"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_id_vendedor_fkey"
            columns: ["id_vendedor"]
            isOneToOne: false
            referencedRelation: "vw_investidor_carteira"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_vendas_id_vendedor_fkey"
            columns: ["id_vendedor"]
            isOneToOne: false
            referencedRelation: "vw_rentabilidade_investidor"
            referencedColumns: ["id_pessoa"]
          },
          {
            foreignKeyName: "vx_vendas_id_vendedor_fkey"
            columns: ["id_vendedor"]
            isOneToOne: false
            referencedRelation: "vx_pessoa"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_vendas_acerto: {
        Row: {
          data_lancamento: string
          data_pagamento: string | null
          id: string
          id_conta: string
          id_forma_pagamento: string
          id_movimento_gerado: string | null
          id_venda: string
          numero: string
          observacao: string | null
          valor: number
        }
        Insert: {
          data_lancamento: string
          data_pagamento?: string | null
          id?: string
          id_conta: string
          id_forma_pagamento: string
          id_movimento_gerado?: string | null
          id_venda: string
          numero: string
          observacao?: string | null
          valor: number
        }
        Update: {
          data_lancamento?: string
          data_pagamento?: string | null
          id?: string
          id_conta?: string
          id_forma_pagamento?: string
          id_movimento_gerado?: string | null
          id_venda?: string
          numero?: string
          observacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vx_vendas_acerto_id_conta_fkey"
            columns: ["id_conta"]
            isOneToOne: false
            referencedRelation: "vx_fin_conta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_acerto_id_forma_pagamento_fkey"
            columns: ["id_forma_pagamento"]
            isOneToOne: false
            referencedRelation: "vx_forma_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_acerto_id_movimento_gerado_fkey"
            columns: ["id_movimento_gerado"]
            isOneToOne: true
            referencedRelation: "vx_fin_movimento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_acerto_id_venda_fkey"
            columns: ["id_venda"]
            isOneToOne: false
            referencedRelation: "vx_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_vendas_financiamento: {
        Row: {
          dados_financiamento: string | null
          data_vencimento_inicial: string | null
          id: string
          id_conta_destino: string
          id_financeira: string | null
          id_veiculo: number
          id_venda: string
          numero_contrato: string | null
          numero_prestacao: number | null
          plus: number | null
          tac: number | null
          valor: number
          valor_prestacao: number | null
          valor_r: number | null
          valor_tac: number | null
        }
        Insert: {
          dados_financiamento?: string | null
          data_vencimento_inicial?: string | null
          id?: string
          id_conta_destino: string
          id_financeira?: string | null
          id_veiculo: number
          id_venda: string
          numero_contrato?: string | null
          numero_prestacao?: number | null
          plus?: number | null
          tac?: number | null
          valor: number
          valor_prestacao?: number | null
          valor_r?: number | null
          valor_tac?: number | null
        }
        Update: {
          dados_financiamento?: string | null
          data_vencimento_inicial?: string | null
          id?: string
          id_conta_destino?: string
          id_financeira?: string | null
          id_veiculo?: number
          id_venda?: string
          numero_contrato?: string | null
          numero_prestacao?: number | null
          plus?: number | null
          tac?: number | null
          valor?: number
          valor_prestacao?: number | null
          valor_r?: number | null
          valor_tac?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vx_vendas_financiamento_id_conta_destino_fkey"
            columns: ["id_conta_destino"]
            isOneToOne: false
            referencedRelation: "vx_fin_conta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_financiamento_id_financeira_fkey"
            columns: ["id_financeira"]
            isOneToOne: false
            referencedRelation: "vx_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_financiamento_id_veiculo_fkey"
            columns: ["id_veiculo"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_financiamento_id_venda_fkey"
            columns: ["id_venda"]
            isOneToOne: true
            referencedRelation: "vx_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_vendas_servico_produto: {
        Row: {
          descricao: string
          id: string
          id_categoria: string
          id_veiculo: number | null
          id_venda: string
          valor: number
        }
        Insert: {
          descricao: string
          id?: string
          id_categoria: string
          id_veiculo?: number | null
          id_venda: string
          valor: number
        }
        Update: {
          descricao?: string
          id?: string
          id_categoria?: string
          id_veiculo?: number | null
          id_venda?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vx_vendas_servico_produto_id_categoria_fkey"
            columns: ["id_categoria"]
            isOneToOne: false
            referencedRelation: "vx_fin_categoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_servico_produto_id_veiculo_fkey"
            columns: ["id_veiculo"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_servico_produto_id_venda_fkey"
            columns: ["id_venda"]
            isOneToOne: false
            referencedRelation: "vx_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vx_vendas_troca: {
        Row: {
          id: string
          id_veiculo_troca: number
          id_venda: string
          valor_troca: number
        }
        Insert: {
          id?: string
          id_veiculo_troca: number
          id_venda: string
          valor_troca: number
        }
        Update: {
          id?: string
          id_veiculo_troca?: number
          id_venda?: string
          valor_troca?: number
        }
        Relationships: [
          {
            foreignKeyName: "vx_vendas_troca_id_veiculo_troca_fkey"
            columns: ["id_veiculo_troca"]
            isOneToOne: false
            referencedRelation: "estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vx_vendas_troca_id_venda_fkey"
            columns: ["id_venda"]
            isOneToOne: false
            referencedRelation: "vx_vendas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_investidor_carteira: {
        Row: {
          alocado: number | null
          carteira: number | null
          id_pessoa: string | null
          nome: string | null
          solicitado: number | null
          total: number | null
        }
        Insert: {
          alocado?: never
          carteira?: never
          id_pessoa?: string | null
          nome?: string | null
          solicitado?: never
          total?: never
        }
        Update: {
          alocado?: never
          carteira?: never
          id_pessoa?: string | null
          nome?: string | null
          solicitado?: never
          total?: never
        }
        Relationships: []
      }
      vw_ponto_equilibrio: {
        Row: {
          cobertura_percentual: number | null
          despesa_loja: number | null
          lucro_bruto_vendas: number | null
          saldo_ponto_equilibrio: number | null
          status_loja: string | null
        }
        Relationships: []
      }
      vw_rentabilidade_investidor: {
        Row: {
          id_pessoa: string | null
          lucro_proporcional_percentual: number | null
          nome_pessoa: string | null
          qtd_veiculos_ativos: number | null
          rentabilidade_proporcional_reais: number | null
          rentabilidade_total_reais: number | null
          valor_total_investido: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_config_id: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      cargos: "Gerente" | "Supervisor" | "Vendedor" | "Avaliador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cargos: ["Gerente", "Supervisor", "Vendedor", "Avaliador"],
    },
  },
} as const
