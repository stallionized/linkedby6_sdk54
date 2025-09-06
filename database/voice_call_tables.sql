-- Voice Calls Table
-- Stores information about voice calls between users
CREATE TABLE IF NOT EXISTS voice_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID,
    receiver_business_id UUID REFERENCES business_profiles(business_id) ON DELETE SET NULL,
    business_id UUID REFERENCES business_profiles(business_id) ON DELETE SET NULL,
    call_status VARCHAR(20) NOT NULL DEFAULT 'ringing' CHECK (call_status IN ('ringing', 'active', 'ended', 'declined', 'missed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    call_quality_rating INTEGER CHECK (call_quality_rating >= 1 AND call_quality_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Signaling Table
-- Stores WebRTC signaling messages for peer-to-peer connection establishment
CREATE TABLE IF NOT EXISTS call_signaling (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'call-end', 'call-decline')),
    call_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voice_calls_caller_id ON voice_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_receiver_id ON voice_calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_business_id ON voice_calls(business_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(call_status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_started_at ON voice_calls(started_at);

CREATE INDEX IF NOT EXISTS idx_call_signaling_call_id ON call_signaling(call_id);
CREATE INDEX IF NOT EXISTS idx_call_signaling_receiver_id ON call_signaling(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_signaling_signal_type ON call_signaling(signal_type);
CREATE INDEX IF NOT EXISTS idx_call_signaling_processed ON call_signaling(processed);
CREATE INDEX IF NOT EXISTS idx_call_signaling_created_at ON call_signaling(created_at);

-- RLS (Row Level Security) Policies
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signaling ENABLE ROW LEVEL SECURITY;

-- Voice Calls Policies
-- Users can view calls they are involved in
CREATE POLICY "Users can view their own calls" ON voice_calls
    FOR SELECT USING (
        auth.uid() = caller_id OR 
        auth.uid() = receiver_id
    );

-- Users can insert calls they initiate
CREATE POLICY "Users can create calls" ON voice_calls
    FOR INSERT WITH CHECK (auth.uid() = caller_id);

-- Users can update calls they are involved in
CREATE POLICY "Users can update their calls" ON voice_calls
    FOR UPDATE USING (
        auth.uid() = caller_id OR 
        auth.uid() = receiver_id
    );

-- Call Signaling Policies
-- Users can view signaling messages for their calls
CREATE POLICY "Users can view their call signaling" ON call_signaling
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Users can insert signaling messages they send
CREATE POLICY "Users can create signaling messages" ON call_signaling
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update signaling messages they receive (to mark as processed)
CREATE POLICY "Users can update received signaling" ON call_signaling
    FOR UPDATE USING (auth.uid() = receiver_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on voice_calls
CREATE TRIGGER update_voice_calls_updated_at 
    BEFORE UPDATE ON voice_calls 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate call duration when call ends
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate duration if call is ending and was previously active
    IF NEW.call_status = 'ended' AND OLD.call_status = 'active' AND NEW.answered_at IS NOT NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.answered_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically calculate call duration
CREATE TRIGGER calculate_voice_call_duration 
    BEFORE UPDATE ON voice_calls 
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_call_duration();

-- Function to clean up old signaling messages (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_signaling_messages()
RETURNS void AS $$
BEGIN
    -- Delete signaling messages older than 24 hours
    DELETE FROM call_signaling 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT ALL ON voice_calls TO authenticated;
GRANT ALL ON call_signaling TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE voice_calls IS 'Stores voice call records between users';
COMMENT ON TABLE call_signaling IS 'Stores WebRTC signaling messages for call establishment';

COMMENT ON COLUMN voice_calls.call_status IS 'Current status of the call: ringing, active, ended, declined, missed, failed';
COMMENT ON COLUMN voice_calls.duration_seconds IS 'Duration of the call in seconds, calculated automatically';
COMMENT ON COLUMN call_signaling.signal_type IS 'Type of WebRTC signaling message: offer, answer, ice-candidate, call-end, call-decline';
COMMENT ON COLUMN call_signaling.call_data IS 'JSON data containing WebRTC signaling information';
COMMENT ON COLUMN call_signaling.processed IS 'Whether this signaling message has been processed by the receiver';
