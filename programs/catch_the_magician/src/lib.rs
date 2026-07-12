use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::MagicIntentBundleBuilder;

declare_id!("74bg3UqJQTXJQihCw1JX7F3NWh9PUhj4UFqjE81rCpnR");

pub const PLAYER_SEED: &[u8] = b"player";
pub const RUN_SEED: &[u8] = b"run";

#[ephemeral]
#[program]
pub mod catch_the_magician {
    use super::*;

    pub fn initialize_player(ctx: Context<InitializePlayer>) -> Result<()> {
        let profile = &mut ctx.accounts.player_profile;
        profile.authority = ctx.accounts.authority.key();
        profile.runs_played = 0;
        profile.best_score = 0;
        profile.best_distance = 0;
        profile.bump = ctx.bumps.player_profile;
        Ok(())
    }

    pub fn start_run(ctx: Context<StartRun>, run_id: u64, session_authority: Pubkey) -> Result<()> {
        let run = &mut ctx.accounts.run_session;
        run.player = ctx.accounts.authority.key();
        run.player_profile = ctx.accounts.player_profile.key();
        run.session_authority = session_authority;
        run.run_id = run_id;
        run.started_at = Clock::get()?.unix_timestamp;
        run.finished_at = 0;
        run.final_score = 0;
        run.final_distance = 0;
        run.status = RunStatus::Active;
        run.bump = ctx.bumps.run_session;
        Ok(())
    }

    pub fn finish_run(ctx: Context<FinishRun>, final_score: u64, final_distance: u64) -> Result<()> {
        let run = &mut ctx.accounts.run_session;
        require!(run.status == RunStatus::Active, GameError::RunNotActive);
        require!(
            ctx.accounts.authority.key() == run.player
                || ctx.accounts.authority.key() == run.session_authority,
            GameError::InvalidRunAuthority
        );

        run.finished_at = Clock::get()?.unix_timestamp;
        run.final_score = final_score;
        run.final_distance = final_distance;
        run.status = RunStatus::Finished;

        let profile = &mut ctx.accounts.player_profile;
        profile.runs_played = profile
            .runs_played
            .checked_add(1)
            .ok_or(GameError::ArithmeticOverflow)?;
        profile.best_score = profile.best_score.max(final_score);
        profile.best_distance = profile.best_distance.max(final_distance);
        Ok(())
    }

    pub fn delegate_run_session(ctx: Context<DelegateRunSession>, run_id: u64) -> Result<()> {
        let player = ctx.accounts.payer.key();
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[RUN_SEED, player.as_ref(), &run_id.to_le_bytes()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn delegate_player_profile(ctx: Context<DelegatePlayerProfile>) -> Result<()> {
        let player = ctx.accounts.payer.key();
        ctx.accounts.delegate_pda(
            &ctx.accounts.payer,
            &[PLAYER_SEED, player.as_ref()],
            DelegateConfig {
                validator: ctx.remaining_accounts.first().map(|acc| acc.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }

    pub fn commit_ranked_session(ctx: Context<CommitRankedSession>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit(&[
            ctx.accounts.player_profile.to_account_info(),
            ctx.accounts.run_session.to_account_info(),
        ])
        .build_and_invoke()?;
        Ok(())
    }

    pub fn undelegate_ranked_session(ctx: Context<CommitRankedSession>) -> Result<()> {
        MagicIntentBundleBuilder::new(
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        )
        .commit_and_undelegate(&[
            ctx.accounts.player_profile.to_account_info(),
            ctx.accounts.run_session.to_account_info(),
        ])
        .build_and_invoke()?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlayer<'info> {
    #[account(
        init,
        payer = authority,
        space = PlayerProfile::SPACE,
        seeds = [PLAYER_SEED, authority.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(run_id: u64)]
pub struct StartRun<'info> {
    #[account(
        seeds = [PLAYER_SEED, authority.key().as_ref()],
        bump = player_profile.bump,
        has_one = authority
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    #[account(
        init,
        payer = authority,
        space = RunSession::SPACE,
        seeds = [RUN_SEED, authority.key().as_ref(), &run_id.to_le_bytes()],
        bump
    )]
    pub run_session: Account<'info, RunSession>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinishRun<'info> {
    #[account(
        mut,
        seeds = [PLAYER_SEED, run_session.player.as_ref()],
        bump = player_profile.bump,
        constraint = player_profile.authority == run_session.player @ GameError::InvalidRunAuthority
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    #[account(
        mut,
        seeds = [RUN_SEED, run_session.player.as_ref(), &run_session.run_id.to_le_bytes()],
        bump = run_session.bump,
        has_one = player_profile @ GameError::InvalidPlayerProfile
    )]
    pub run_session: Account<'info, RunSession>,
    pub authority: Signer<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateRunSession<'info> {
    pub payer: Signer<'info>,
    /// CHECK: RunSession PDA delegated to MagicBlock's Delegation Program.
    #[account(mut, del)]
    pub pda: UncheckedAccount<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegatePlayerProfile<'info> {
    pub payer: Signer<'info>,
    /// CHECK: PlayerProfile PDA delegated to MagicBlock's Delegation Program.
    #[account(mut, del)]
    pub pda: UncheckedAccount<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitRankedSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, run_session.player.as_ref()],
        bump = player_profile.bump,
        constraint = player_profile.authority == run_session.player @ GameError::InvalidRunAuthority
    )]
    pub player_profile: Account<'info, PlayerProfile>,
    #[account(
        mut,
        seeds = [RUN_SEED, run_session.player.as_ref(), &run_session.run_id.to_le_bytes()],
        bump = run_session.bump
    )]
    pub run_session: Account<'info, RunSession>,
}

#[account]
pub struct PlayerProfile {
    pub authority: Pubkey,
    pub runs_played: u64,
    pub best_score: u64,
    pub best_distance: u64,
    pub bump: u8,
}

impl PlayerProfile {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct RunSession {
    pub player: Pubkey,
    pub player_profile: Pubkey,
    pub session_authority: Pubkey,
    pub run_id: u64,
    pub started_at: i64,
    pub finished_at: i64,
    pub final_score: u64,
    pub final_distance: u64,
    pub status: RunStatus,
    pub bump: u8,
}

impl RunSession {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RunStatus {
    Active,
    Finished,
}

#[error_code]
pub enum GameError {
    #[msg("This run is not active.")]
    RunNotActive,
    #[msg("The run authority does not match the connected wallet.")]
    InvalidRunAuthority,
    #[msg("The run belongs to a different player profile.")]
    InvalidPlayerProfile,
    #[msg("A profile counter exceeded its supported range.")]
    ArithmeticOverflow,
}
